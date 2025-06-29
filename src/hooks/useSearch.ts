/**
 * Search hook for querying users and questions from the database
 * Provides comprehensive search functionality across users and questions
 */

import { useState } from 'react';
import { supabase, isOfflineMode } from '../lib/supabase';
import { offlineDB } from '../lib/offlineDB';
import { Question, User } from '../types';

interface SearchResults {
  questions: Question[];
  users: User[];
  loading: boolean;
  error: string | null;
}

export const useSearch = () => {
  const [results, setResults] = useState<SearchResults>({
    questions: [],
    users: [],
    loading: false,
    error: null
  });

  const searchDatabase = async (searchTerm: string): Promise<SearchResults> => {
    if (!searchTerm.trim()) {
      return { questions: [], users: [], loading: false, error: null };
    }

    setResults(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (isOfflineMode()) {
        // Offline mode: search localStorage
        const [questions, users] = await Promise.all([
          offlineDB.getQuestions(),
          offlineDB.getUsers()
        ]);

        const searchLower = searchTerm.toLowerCase();
        
        // Filter users
        const filteredUsers = users.filter(user =>
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );

        // Filter questions with author information
        const questionsWithAuthors = questions.map(question => ({
          ...question,
          author: users.find(user => user.id === question.author_id)
        }));

        const filteredQuestions = questionsWithAuthors.filter(question => {
          const titleMatch = question.title.toLowerCase().includes(searchLower);
          const contentMatch = question.content.toLowerCase().includes(searchLower);
          const tagMatch = question.tags.some(tag => tag.toLowerCase().includes(searchLower));
          const authorMatch = question.author?.username.toLowerCase().includes(searchLower);
          
          return titleMatch || contentMatch || tagMatch || authorMatch;
        });

        const searchResults = {
          questions: filteredQuestions,
          users: filteredUsers,
          loading: false,
          error: null
        };

        setResults(searchResults);
        return searchResults;
      } else {
        // Online mode: search Supabase database
        const searchPattern = `%${searchTerm}%`;
        
        // Search users
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .limit(10);

        if (usersError) throw usersError;

        // Search questions with author information
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select(`
            *,
            author:profiles!questions_author_id_fkey(*)
          `)
          .or(`
            title.ilike.${searchPattern},
            content.ilike.${searchPattern},
            tags.cs.{${searchTerm}}
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (questionsError) throw questionsError;

        // Also search for questions where the author username matches
        const { data: questionsByAuthor, error: authorQuestionsError } = await supabase
          .from('questions')
          .select(`
            *,
            author:profiles!questions_author_id_fkey(*)
          `)
          .eq('profiles.username', searchTerm)
          .order('created_at', { ascending: false })
          .limit(10);

        if (authorQuestionsError) {
          console.warn('Author questions search failed:', authorQuestionsError);
        }

        // Combine and deduplicate questions
        const allQuestions = [...(questions || [])];
        if (questionsByAuthor) {
          questionsByAuthor.forEach(q => {
            if (!allQuestions.find(existing => existing.id === q.id)) {
              allQuestions.push(q);
            }
          });
        }

        const searchResults = {
          questions: allQuestions,
          users: users || [],
          loading: false,
          error: null
        };

        setResults(searchResults);
        return searchResults;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      const errorResults = {
        questions: [],
        users: [],
        loading: false,
        error: errorMessage
      };
      
      setResults(errorResults);
      return errorResults;
    }
  };

  const clearSearch = () => {
    setResults({
      questions: [],
      users: [],
      loading: false,
      error: null
    });
  };

  return {
    results,
    searchDatabase,
    clearSearch
  };
};