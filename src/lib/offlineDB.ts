/**
 * Offline database functionality using localStorage
 * Provides SQL-like operations for private network events
 */

import { User, Question, Answer, Vote } from '../types';

class OfflineDB {
  private storage = localStorage;

  /**
   * Generic method to save data to localStorage
   */
  private save<T>(key: string, data: T[]): void {
    this.storage.setItem(key, JSON.stringify(data));
  }

  /**
   * Generic method to load data from localStorage
   */
  private load<T>(key: string): T[] {
    const data = this.storage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Generate UUID for offline records
   */
  private generateId(): string {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return this.load<User>('offline_users');
  }

  async saveUser(user: Omit<User, 'id'>): Promise<User> {
    const users = await this.getUsers();
    const newUser: User = { ...user, id: this.generateId() };
    users.push(newUser);
    this.save('offline_users', users);
    return newUser;
  }

  // Question operations
  async getQuestions(): Promise<Question[]> {
    return this.load<Question>('offline_questions');
  }

  async saveQuestion(question: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<Question> {
    const questions = await this.getQuestions();
    const newQuestion: Question = {
      ...question,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    questions.push(newQuestion);
    this.save('offline_questions', questions);
    return newQuestion;
  }

  // Answer operations
  async getAnswers(): Promise<Answer[]> {
    return this.load<Answer>('offline_answers');
  }

  async saveAnswer(answer: Omit<Answer, 'id' | 'created_at' | 'updated_at'>): Promise<Answer> {
    const answers = await this.getAnswers();
    const newAnswer: Answer = {
      ...answer,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    answers.push(newAnswer);
    this.save('offline_answers', answers);
    return newAnswer;
  }

  // Vote operations
  async getVotes(): Promise<Vote[]> {
    return this.load<Vote>('offline_votes');
  }

  async saveVote(vote: Omit<Vote, 'id' | 'created_at'>): Promise<Vote> {
    const votes = await this.getVotes();
    const newVote: Vote = {
      ...vote,
      id: this.generateId(),
      created_at: new Date().toISOString()
    };
    votes.push(newVote);
    this.save('offline_votes', votes);
    return newVote;
  }

  /**
   * Clear all offline data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    this.storage.removeItem('offline_users');
    this.storage.removeItem('offline_questions');
    this.storage.removeItem('offline_answers');
    this.storage.removeItem('offline_votes');
  }
}

export const offlineDB = new OfflineDB();