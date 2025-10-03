// Lesson Mode System
// Structured learning with progress tracking, quizzes, and analytics

export class LessonSystem {
    constructor() {
        this.currentLesson = null;
        this.lessons = new Map();
        this.progress = this.loadProgress();
    }
    
    // Load progress from localStorage
    loadProgress() {
        try {
            const saved = localStorage.getItem('ai_tutor_lesson_progress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load lesson progress:', error);
            return {};
        }
    }
    
    // Save progress to localStorage
    saveProgress() {
        try {
            localStorage.setItem('ai_tutor_lesson_progress', JSON.stringify(this.progress));
        } catch (error) {
            console.error('Failed to save lesson progress:', error);
        }
    }
    
    // Create a new lesson structure
    createLesson(topic, difficulty = 'intermediate') {
        const lessonId = `lesson_${Date.now()}`;
        
        const lesson = {
            id: lessonId,
            topic,
            difficulty,
            createdAt: Date.now(),
            structure: {
                introduction: {
                    completed: false,
                    duration: 0,
                    startedAt: null
                },
                concepts: [],
                practice: {
                    exercises: [],
                    completed: 0,
                    total: 0
                },
                quiz: {
                    questions: [],
                    score: null,
                    attempts: 0
                },
                summary: {
                    completed: false,
                    notes: ''
                }
            },
            progress: {
                percentage: 0,
                currentSection: 'introduction',
                timeSpent: 0,
                lastAccessed: Date.now()
            },
            analytics: {
                strengths: [],
                weaknesses: [],
                comprehensionScore: 0,
                engagementLevel: 0
            }
        };
        
        this.lessons.set(lessonId, lesson);
        this.currentLesson = lesson;
        
        // Initialize progress tracking
        if (!this.progress[topic]) {
            this.progress[topic] = {
                lessons: [],
                totalTimeSpent: 0,
                overallProgress: 0,
                masteryLevel: 0
            };
        }
        
        this.progress[topic].lessons.push(lessonId);
        this.saveProgress();
        
        return lesson;
    }
    
    // Add a concept to the lesson
    addConcept(conceptData) {
        if (!this.currentLesson) return null;
        
        const concept = {
            id: `concept_${Date.now()}`,
            title: conceptData.title,
            explanation: conceptData.explanation,
            examples: conceptData.examples || [],
            checkQuestions: conceptData.checkQuestions || [],
            completed: false,
            understood: null, // true/false based on check questions
            timeSpent: 0,
            notes: ''
        };
        
        this.currentLesson.structure.concepts.push(concept);
        this.saveProgress();
        
        return concept;
    }
    
    // Add practice exercise
    addExercise(exercise) {
        if (!this.currentLesson) return null;
        
        const ex = {
            id: `exercise_${Date.now()}`,
            question: exercise.question,
            type: exercise.type, // 'multiple-choice', 'open-ended', 'code', 'problem-solving'
            options: exercise.options || null,
            correctAnswer: exercise.correctAnswer || null,
            hints: exercise.hints || [],
            userAnswer: null,
            correct: null,
            attempts: 0,
            timeSpent: 0
        };
        
        this.currentLesson.structure.practice.exercises.push(ex);
        this.currentLesson.structure.practice.total++;
        this.saveProgress();
        
        return ex;
    }
    
    // Mark concept as completed
    completeConcept(conceptId, understood = true) {
        if (!this.currentLesson) return;
        
        const concept = this.currentLesson.structure.concepts.find(c => c.id === conceptId);
        if (concept) {
            concept.completed = true;
            concept.understood = understood;
            
            this.updateProgress();
            this.saveProgress();
        }
    }
    
    // Submit exercise answer
    submitExercise(exerciseId, answer) {
        if (!this.currentLesson) return null;
        
        const exercise = this.currentLesson.structure.practice.exercises.find(e => e.id === exerciseId);
        if (!exercise) return null;
        
        exercise.userAnswer = answer;
        exercise.attempts++;
        
        if (exercise.correctAnswer) {
            exercise.correct = this.checkAnswer(answer, exercise.correctAnswer, exercise.type);
            if (exercise.correct) {
                this.currentLesson.structure.practice.completed++;
            }
        }
        
        this.updateProgress();
        this.saveProgress();
        
        return {
            correct: exercise.correct,
            feedback: this.generateFeedback(exercise)
        };
    }
    
    // Check if answer is correct
    checkAnswer(userAnswer, correctAnswer, type) {
        switch (type) {
            case 'multiple-choice':
                return userAnswer === correctAnswer;
            case 'open-ended':
                // Simple keyword matching (can be enhanced)
                return userAnswer.toLowerCase().includes(correctAnswer.toLowerCase());
            default:
                return false;
        }
    }
    
    // Generate feedback for exercise
    generateFeedback(exercise) {
        if (exercise.correct) {
            return {
                message: '✅ Correct! Well done!',
                encouragement: 'You\'re mastering this concept.',
                nextStep: 'Continue to the next exercise.'
            };
        } else {
            const hintsAvailable = exercise.hints.length > 0;
            return {
                message: '❌ Not quite right.',
                suggestion: hintsAvailable ? `Try again. Hint: ${exercise.hints[exercise.attempts - 1] || exercise.hints[0]}` : 'Review the concept and try again.',
                encouragement: 'Learning from mistakes is part of the process!'
            };
        }
    }
    
    // Create quiz questions
    createQuiz(questions) {
        if (!this.currentLesson) return;
        
        this.currentLesson.structure.quiz.questions = questions.map((q, index) => ({
            id: `quiz_q${index + 1}`,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            userAnswer: null,
            correct: null
        }));
        
        this.saveProgress();
    }
    
    // Submit quiz
    submitQuiz(answers) {
        if (!this.currentLesson) return null;
        
        let correct = 0;
        const total = this.currentLesson.structure.quiz.questions.length;
        
        this.currentLesson.structure.quiz.questions.forEach((q, index) => {
            q.userAnswer = answers[index];
            q.correct = answers[index] === q.correctAnswer;
            if (q.correct) correct++;
        });
        
        const score = (correct / total) * 100;
        this.currentLesson.structure.quiz.score = score;
        this.currentLesson.structure.quiz.attempts++;
        
        this.updateAnalytics(score);
        this.updateProgress();
        this.saveProgress();
        
        return {
            score,
            correct,
            total,
            passed: score >= 70, // 70% passing grade
            questions: this.currentLesson.structure.quiz.questions
        };
    }
    
    // Update lesson progress
    updateProgress() {
        if (!this.currentLesson) return;
        
        const structure = this.currentLesson.structure;
        let completed = 0;
        let total = 0;
        
        // Introduction
        if (structure.introduction.completed) completed++;
        total++;
        
        // Concepts
        completed += structure.concepts.filter(c => c.completed).length;
        total += structure.concepts.length;
        
        // Practice
        completed += structure.practice.completed;
        total += structure.practice.total;
        
        // Quiz
        if (structure.quiz.score !== null) completed++;
        if (structure.quiz.questions.length > 0) total++;
        
        // Summary
        if (structure.summary.completed) completed++;
        total++;
        
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        this.currentLesson.progress.percentage = percentage;
        this.currentLesson.progress.lastAccessed = Date.now();
        
        // Update topic progress
        const topic = this.currentLesson.topic;
        if (this.progress[topic]) {
            const topicLessons = this.progress[topic].lessons
                .map(id => this.lessons.get(id))
                .filter(l => l);
            
            const avgProgress = topicLessons.reduce((sum, l) => sum + l.progress.percentage, 0) / topicLessons.length;
            this.progress[topic].overallProgress = Math.round(avgProgress);
        }
    }
    
    // Update analytics based on performance
    updateAnalytics(quizScore) {
        if (!this.currentLesson) return;
        
        const analytics = this.currentLesson.analytics;
        
        // Comprehension score (weighted average of quiz and practice)
        const practiceScore = this.currentLesson.structure.practice.total > 0
            ? (this.currentLesson.structure.practice.completed / this.currentLesson.structure.practice.total) * 100
            : 0;
        
        analytics.comprehensionScore = Math.round((quizScore * 0.6 + practiceScore * 0.4));
        
        // Identify strengths and weaknesses
        const concepts = this.currentLesson.structure.concepts;
        analytics.strengths = concepts.filter(c => c.understood === true).map(c => c.title);
        analytics.weaknesses = concepts.filter(c => c.understood === false).map(c => c.title);
        
        // Engagement level (based on time spent and completion)
        const avgTimePerSection = this.currentLesson.progress.timeSpent / (concepts.length + 1);
        analytics.engagementLevel = avgTimePerSection > 180 ? 'high' : avgTimePerSection > 60 ? 'medium' : 'low';
    }
    
    // Get lesson summary
    getLessonSummary() {
        if (!this.currentLesson) return null;
        
        return {
            topic: this.currentLesson.topic,
            progress: this.currentLesson.progress.percentage,
            timeSpent: Math.round(this.currentLesson.progress.timeSpent / 60), // minutes
            comprehension: this.currentLesson.analytics.comprehensionScore,
            strengths: this.currentLesson.analytics.strengths,
            weaknesses: this.currentLesson.analytics.weaknesses,
            quizScore: this.currentLesson.structure.quiz.score,
            practiceComplete: this.currentLesson.structure.practice.completed,
            practiceTotal: this.currentLesson.structure.practice.total
        };
    }
    
    // Get all topic progress
    getTopicProgress(topic) {
        return this.progress[topic] || null;
    }
    
    // Get recommended next topic
    getRecommendedTopic() {
        // Find topics with lowest mastery
        const topics = Object.entries(this.progress)
            .sort((a, b) => a[1].masteryLevel - b[1].masteryLevel);
        
        return topics.length > 0 ? topics[0][0] : null;
    }
    
    // Export lesson data
    exportLesson() {
        if (!this.currentLesson) return null;
        
        return {
            lesson: this.currentLesson,
            summary: this.getLessonSummary(),
            exportedAt: new Date().toISOString()
        };
    }
}

// Spaced Repetition System for Flashcards
export class SpacedRepetitionSystem {
    constructor() {
        this.flashcards = this.loadFlashcards();
    }
    
    loadFlashcards() {
        try {
            const saved = localStorage.getItem('ai_tutor_flashcards');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }
    
    saveFlashcards() {
        try {
            localStorage.setItem('ai_tutor_flashcards', JSON.stringify(this.flashcards));
        } catch (error) {
            console.error('Failed to save flashcards:', error);
        }
    }
    
    // Create flashcard
    createCard(topic, question, answer, tags = []) {
        const cardId = `card_${Date.now()}`;
        
        if (!this.flashcards[topic]) {
            this.flashcards[topic] = [];
        }
        
        const card = {
            id: cardId,
            question,
            answer,
            tags,
            createdAt: Date.now(),
            interval: 1, // days
            repetitions: 0,
            easeFactor: 2.5,
            nextReview: Date.now(),
            lastReviewed: null,
            bucket: 1 // 1-5 (1=new, 5=mastered)
        };
        
        this.flashcards[topic].push(card);
        this.saveFlashcards();
        
        return card;
    }
    
    // Review card (SM-2 algorithm)
    reviewCard(topic, cardId, quality) {
        // quality: 0-5 (0=total blackout, 5=perfect recall)
        const card = this.flashcards[topic]?.find(c => c.id === cardId);
        if (!card) return null;
        
        card.lastReviewed = Date.now();
        card.repetitions++;
        
        if (quality < 3) {
            // Reset if poorly recalled
            card.repetitions = 0;
            card.interval = 1;
            card.bucket = Math.max(1, card.bucket - 1);
        } else {
            // Calculate new interval using SM-2
            if (card.repetitions === 1) {
                card.interval = 1;
            } else if (card.repetitions === 2) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            
            // Update ease factor
            card.easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            card.easeFactor = Math.max(1.3, card.easeFactor);
            
            // Update bucket
            if (quality >= 4 && card.repetitions >= 3) {
                card.bucket = Math.min(5, card.bucket + 1);
            }
        }
        
        // Set next review date
        card.nextReview = Date.now() + (card.interval * 24 * 60 * 60 * 1000);
        
        this.saveFlashcards();
        
        return {
            nextReview: card.nextReview,
            interval: card.interval,
            bucket: card.bucket
        };
    }
    
    // Get cards due for review
    getDueCards(topic) {
        if (!this.flashcards[topic]) return [];
        
        const now = Date.now();
        return this.flashcards[topic]
            .filter(card => card.nextReview <= now)
            .sort((a, b) => a.nextReview - b.nextReview);
    }
    
    // Get statistics
    getStats(topic) {
        if (!this.flashcards[topic]) return null;
        
        const cards = this.flashcards[topic];
        const now = Date.now();
        
        return {
            total: cards.length,
            new: cards.filter(c => c.repetitions === 0).length,
            learning: cards.filter(c => c.bucket <= 2 && c.repetitions > 0).length,
            review: cards.filter(c => c.bucket >= 3 && c.nextReview <= now).length,
            mastered: cards.filter(c => c.bucket === 5).length
        };
    }
}
