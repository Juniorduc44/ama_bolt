/**
 * Custom hook for question management
 * Handles CRUD operations for questions in both online and offline modes
 * Supports both authenticated and anonymous question creation
 */

import { useState, useEffect } from 'react';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { Question } from '../types';
import { useAuth } from './useAuth';

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { auth } = useAuth();

  // Load questions on component mount
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOfflineMode()) {
        // Offline mode: load from localStorage
        const offlineQuestions = await offlineDB.getQuestions();
        const users = await offlineDB.getUsers();
        
        // Attach author information
        const questionsWithAuthors = offlineQuestions.map(question => ({
          ...question,
          author: users.find(user => user.id === question.author_id)
        }));

        setQuestions(questionsWithAuthors);
      } else {
        // Online mode: load from Supabase with fallback to offline
        try {
          // First get questions
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });

          if (questionsError) throw questionsError;

          // Then get profiles for the authors (only for questions that have author_id)
          const authorIds = [...new Set(questionsData?.map(q => q.author_id).filter(Boolean))];
          
          let profilesData = [];
          if (authorIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .in('id', authorIds);

            if (profilesError) throw profilesError;
            profilesData = profiles || [];
          }

          // Combine questions with author profiles
          const questionsWithAuthors = questionsData?.map(question => ({
            ...question,
            author: question.author_id ? profilesData.find(profile => profile.id === question.author_id) : null
          })) || [];

          setQuestions(questionsWithAuthors);
        } catch (supabaseError) {
          // If Supabase fails, fall back to offline mode
          console.warn('Supabase connection failed, falling back to offline mode:', supabaseError);
          
          const offlineQuestions = await offlineDB.getQuestions();
          const users = await offlineDB.getUsers();
          
          // Attach author information
          const questionsWithAuthors = offlineQuestions.map(question => ({
            ...question,
            author: users.find(user => user.id === question.author_id)
          }));

          setQuestions(questionsWithAuthors);
          
          // Set a warning message instead of an error
          setError('Running in offline mode - some features may be limited');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (
    title: string, 
    content: string, 
    tags: string[] = [],
    askerName?: string,
    isAnonymous: boolean = false
  ) => {
    try {
      setError(null);

      const questionData = {
        title,
        content,
        author_id: auth.user?.id || null, // null for anonymous questions
        votes: 0,
        answer_count: 0,
        tags,
        is_answered: false,
        is_featured: false,
        asker_name: !auth.user && !isAnonymous ? askerName : null, // Store name for non-authenticated, non-anonymous users
        is_anonymous: isAnonymous
      };

      if (isOfflineMode()) {
        // Offline mode: save to localStorage
        const newQuestion = await offlineDB.saveQuestion(questionData);
        setQuestions(prev => [{ ...newQuestion, author: auth.user }, ...prev]);
        return newQuestion;
      } else {
        // Online mode: save to Supabase with fallback to offline
        try {
          const { data, error } = await supabase
            .from('questions')
            .insert([questionData])
            .select('*')
            .single();

          if (error) throw error;
          
          // Get the author profile for the new question (if authenticated)
          let authorProfile = null;
          if (auth.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', auth.user.id)
              .single();
            authorProfile = profile;
          }

          const questionWithAuthor = {
            ...data,
            author: authorProfile
          };
          
          setQuestions(prev => [questionWithAuthor, ...prev]);
          return questionWithAuthor;
        } catch (supabaseError) {
          // If Supabase fails, fall back to offline mode
          console.warn('Supabase connection failed, saving offline:', supabaseError);
          
          const newQuestion = await offlineDB.saveQuestion(questionData);
          setQuestions(prev => [{ ...newQuestion, author: auth.user }, ...prev]);
          
          // Set a warning message
          setError('Question saved offline - will sync when connection is restored');
          return newQuestion;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create question';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const voteOnQuestion = async (questionId: string, voteType: 'up' | 'down') => {
    if (!auth.user) throw new Error('Must be logged in to vote');

    try {
      setError(null);

      if (isOfflineMode()) {
        // Offline mode: update votes in localStorage
        const votes = await offlineDB.getVotes();
        const existingVote = votes.find(
          vote => vote.user_id === auth.user!.id && 
                 vote.target_id === questionId && 
                 vote.target_type === 'question'
        );

        if (existingVote && existingVote.vote_type === voteType) {
          // Remove vote if clicking same type
          return;
        }

        // Save new vote
        await offlineDB.saveVote({
          user_id: auth.user.id,
          target_id: questionId,
          target_type: 'question',
          vote_type: voteType
        });

        // Update question vote count
        const questions = await offlineDB.getQuestions();
        const updatedQuestions = questions.map(q => {
          if (q.id === questionId) {
            const increment = voteType === 'up' ? 1 : -1;
            return { ...q, votes: q.votes + increment };
          }
          return q;
        });
        
        // Save updated questions (in a real app, this would be more sophisticated)
        localStorage.setItem('offline_questions', JSON.stringify(updatedQuestions));
        loadQuestions(); // Refresh display
      } else {
        // Online mode: handle voting through Supabase with fallback
        try {
          const { error } = await supabase.rpc('vote_on_question', {
            question_id: questionId,
            user_id: auth.user.id,
            vote_type: voteType
          });

          if (error) throw error;
          loadQuestions(); // Refresh questions
        } catch (supabaseError) {
          // If Supabase fails, fall back to offline voting
          console.warn('Supabase voting failed, using offline mode:', supabaseError);
          
          const votes = await offlineDB.getVotes();
          const existingVote = votes.find(
            vote => vote.user_id === auth.user!.id && 
                   vote.target_id === questionId && 
                   vote.target_type === 'question'
          );

          if (existingVote && existingVote.vote_type === voteType) {
            return;
          }

          await offlineDB.saveVote({
            user_id: auth.user.id,
            target_id: questionId,
            target_type: 'question',
            vote_type: voteType
          });

          const questions = await offlineDB.getQuestions();
          const updatedQuestions = questions.map(q => {
            if (q.id === questionId) {
              const increment = voteType === 'up' ? 1 : -1;
              return { ...q, votes: q.votes + increment };
            }
            return q;
          });
          
          localStorage.setItem('offline_questions', JSON.stringify(updatedQuestions));
          loadQuestions();
          
          setError('Vote saved offline - will sync when connection is restored');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
      throw err;
    }
  };

  return {
    questions,
    loading,
    error,
    loadQuestions,
    createQuestion,
    voteOnQuestion
  };
};