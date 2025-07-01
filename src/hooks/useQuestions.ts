/**
 * Custom hook for question management
 * Handles CRUD operations for questions in both online and offline modes
 * Supports both authenticated and anonymous question creation
 */

import { useState, useEffect } from 'react';
import { supabase, isOfflineMode, safeSupabaseOperation } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { Question } from '../types';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { auth } = useAuth();
  const { warning, error: showError } = useToast();

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
        // Online mode: use safe Supabase operation with fallback
        const result = await safeSupabaseOperation(async () => {
          // First get questions
          const { data: questionsData, error: questionsError } = await supabase!
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });

          if (questionsError) throw questionsError;

          // Then get profiles for the authors (only for questions that have author_id)
          const authorIds = [...new Set(questionsData?.map(q => q.author_id).filter(Boolean))];
          
          let profilesData = [];
          if (authorIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase!
              .from('profiles')
              .select('*')
              .in('id', authorIds);

            if (profilesError) throw profilesError;
            profilesData = profiles || [];
          }

          // Combine questions with author profiles
          return questionsData?.map(question => ({
            ...question,
            author: question.author_id ? profilesData.find(profile => profile.id === question.author_id) : null
          })) || [];
        }, []);

        if (Array.isArray(result)) {
          setQuestions(result);
        } else {
          // Fallback failed, try offline mode
          warning(
            'Connection Issues',
            'Unable to connect to server. Loading offline data.'
          );
          
          const offlineQuestions = await offlineDB.getQuestions();
          const users = await offlineDB.getUsers();
          
          const questionsWithAuthors = offlineQuestions.map(question => ({
            ...question,
            author: users.find(user => user.id === question.author_id)
          }));

          setQuestions(questionsWithAuthors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load questions';
      setError(errorMessage);
      showError('Error Loading Questions', errorMessage);
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
        // Online mode: use safe Supabase operation with fallback
        const result = await safeSupabaseOperation(async () => {
          const { data, error } = await supabase!
            .from('questions')
            .insert([questionData])
            .select('*')
            .single();

          if (error) throw error;
          
          // Get the author profile for the new question (if authenticated)
          let authorProfile = null;
          if (auth.user) {
            const { data: profile } = await supabase!
              .from('profiles')
              .select('*')
              .eq('id', auth.user.id)
              .single();
            authorProfile = profile;
          }

          return {
            ...data,
            author: authorProfile
          };
        }, null);

        if (result) {
          setQuestions(prev => [result, ...prev]);
          return result;
        } else {
          // Fallback to offline mode
          warning(
            'Saved Offline',
            'Question saved locally. It will sync when connection is restored.'
          );
          
          const newQuestion = await offlineDB.saveQuestion(questionData);
          setQuestions(prev => [{ ...newQuestion, author: auth.user }, ...prev]);
          return newQuestion;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create question';
      setError(errorMessage);
      showError('Error Creating Question', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const voteOnQuestion = async (questionId: string, voteType: 'up' | 'down') => {
    if (!auth.user) {
      showError('Authentication Required', 'Please sign in to vote on questions');
      throw new Error('Must be logged in to vote');
    }

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
        
        localStorage.setItem('offline_questions', JSON.stringify(updatedQuestions));
        loadQuestions(); // Refresh display
      } else {
        // Online mode: use safe Supabase operation with fallback
        const result = await safeSupabaseOperation(async () => {
          const { error } = await supabase!.rpc('vote_on_question', {
            question_id: questionId,
            user_id: auth.user!.id,
            vote_type: voteType
          });

          if (error) throw error;
          return true;
        }, false);

        if (result) {
          loadQuestions(); // Refresh questions
        } else {
          // Fallback to offline voting
          warning(
            'Vote Saved Offline',
            'Your vote has been saved locally and will sync when connection is restored.'
          );
          
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
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote';
      setError(errorMessage);
      showError('Error Voting', errorMessage);
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