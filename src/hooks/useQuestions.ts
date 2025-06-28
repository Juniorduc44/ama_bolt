/**
 * Custom hook for question management
 * Handles CRUD operations for questions in both online and offline modes
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
        // Online mode: load from Supabase
        const { data, error } = await supabase
          .from('questions')
          .select(`
            *,
            author:profiles(*)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuestions(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (title: string, content: string, tags: string[] = []) => {
    if (!auth.user) throw new Error('Must be logged in to create questions');

    try {
      setError(null);

      const questionData = {
        title,
        content,
        author_id: auth.user.id,
        votes: 0,
        answer_count: 0,
        tags,
        is_answered: false,
        is_featured: false
      };

      if (isOfflineMode()) {
        // Offline mode: save to localStorage
        const newQuestion = await offlineDB.saveQuestion(questionData);
        setQuestions(prev => [{ ...newQuestion, author: auth.user }, ...prev]);
        return newQuestion;
      } else {
        // Online mode: save to Supabase
        const { data, error } = await supabase
          .from('questions')
          .insert([questionData])
          .select(`
            *,
            author:profiles(*)
          `)
          .single();

        if (error) throw error;
        
        setQuestions(prev => [data, ...prev]);
        return data;
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
        // Online mode: handle voting through Supabase
        // This would typically involve more complex logic for vote tracking
        const { error } = await supabase.rpc('vote_on_question', {
          question_id: questionId,
          user_id: auth.user.id,
          vote_type: voteType
        });

        if (error) throw error;
        loadQuestions(); // Refresh questions
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