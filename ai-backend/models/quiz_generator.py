from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime
import random
import re
import asyncio

class QuizGenerator:
    def __init__(self, llm_handler):
        self.llm_handler = llm_handler
        self.document_store = {}  # In-memory storage for documents
        self.quiz_store = {}     # Store generated quizzes
        self.vector_store = {}   # Simple vector storage simulation
    
    def store_documents(self, documents: List[Dict], subject: str) -> List[str]:
        """Store documents for RAG-based quiz generation with enhanced indexing"""
        doc_ids = []
        
        print(f"📚 Storing {len(documents)} documents for subject: {subject}")
        
        for doc in documents:
            doc_id = doc.get('id') or str(uuid.uuid4())
            
            # Enhanced document storage with preprocessing
            processed_content = self._preprocess_content(doc["content"])
            
            self.document_store[doc_id] = {
                "id": doc_id,
                "content": processed_content,
                "original_content": doc["content"],
                "filename": doc["filename"],
                "subject": subject,
                "file_type": doc.get("file_type", "unknown"),
                "file_size": doc.get("file_size", 0),
                "created_at": datetime.now().isoformat(),
                "processed": True,
                "keywords": self._extract_keywords(processed_content),
                "sentences": self._split_into_sentences(processed_content)
            }
            
            # Simple vector indexing (in real implementation, use proper embeddings)
            self._index_document(doc_id, processed_content, subject)
            
            doc_ids.append(doc_id)
            print(f"✅ Stored document: {doc['filename']} ({len(processed_content)} chars)")
        
        print(f"✅ Successfully stored {len(doc_ids)} documents")
        return doc_ids
    
    def _preprocess_content(self, content: str) -> str:
        """Clean and preprocess document content"""
        if not content:
            return ""
        
        # Remove extra whitespace
        content = ' '.join(content.split())
        
        # Remove special characters but keep basic punctuation
        content = re.sub(r'[^\w\s\.\,\!\?\-\:\;\(\)]', ' ', content)
        
        # Remove multiple spaces
        content = re.sub(r'\s+', ' ', content)
        
        return content.strip()
    
    def _extract_keywords(self, content: str) -> List[str]:
        """Extract keywords from content for better matching"""
        # Simple keyword extraction
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        
        # Remove common stop words
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
            'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 
            'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 
            'this', 'that', 'these', 'those', 'a', 'an'
        }
        
        keywords = [word for word in words if word not in stop_words]
        
        # Get frequency and return top keywords
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top 20
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:20]]
    
    def _split_into_sentences(self, content: str) -> List[str]:
        """Split content into sentences for question generation"""
        sentences = re.split(r'[.!?]+', content)
        return [s.strip() for s in sentences if len(s.strip()) > 20]
    
    def _index_document(self, doc_id: str, content: str, subject: str):
        """Simple document indexing for retrieval"""
        if subject not in self.vector_store:
            self.vector_store[subject] = {}
        
        self.vector_store[subject][doc_id] = {
            'content': content,
            'length': len(content),
            'indexed_at': datetime.now().isoformat()
        }
    
    async def generate_quiz(self, subject: str, topic: str, quiz_type: str, 
                           num_questions: int, difficulty: str = "medium") -> Dict[str, Any]:
        """Enhanced quiz generation with better content matching"""
        try:
            print(f"🧠 Generating {quiz_type} quiz: {num_questions} questions for {subject}")
            
            # Find relevant documents with improved matching
            relevant_docs = self._find_relevant_documents_enhanced(subject, topic)
            
            if not relevant_docs:
                print(f"⚠️ No documents found for subject: {subject}")
                return self._generate_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty)
            
            print(f"📚 Found {len(relevant_docs)} relevant documents")
            
            # Extract and prepare content for quiz generation
            content_chunks = self._prepare_content_for_quiz(relevant_docs, topic)
            
            # Generate questions based on type
            if quiz_type == "mcq":
                questions = await self._generate_mcq_questions_enhanced(
                    content_chunks, topic, num_questions, difficulty
                )
            else:
                questions = await self._generate_subjective_questions_enhanced(
                    content_chunks, topic, num_questions, difficulty
                )
            
            # Create quiz object
            quiz_id = str(uuid.uuid4())
            quiz = {
                "id": quiz_id,
                "subject": subject,
                "topic": topic,
                "quiz_type": quiz_type,
                "difficulty": difficulty,
                "questions": questions,
                "total_questions": len(questions),
                "created_at": datetime.now().isoformat(),
                "source_documents": [doc["id"] for doc in relevant_docs],
                "generation_method": "enhanced_rag"
            }
            
            # Store quiz for evaluation
            self.quiz_store[quiz_id] = quiz
            
            print(f"✅ Generated quiz with {len(questions)} questions")
            return quiz
            
        except Exception as e:
            print(f"❌ Error in enhanced quiz generation: {e}")
            return self._generate_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty)
    
    def _find_relevant_documents_enhanced(self, subject: str, topic: str) -> List[Dict]:
        """Enhanced document retrieval with better matching"""
        relevant_docs = []
        
        # First, get all documents for the subject
        subject_docs = [doc for doc in self.document_store.values() 
                       if doc["subject"].lower() == subject.lower()]
        
        if not subject_docs:
            return relevant_docs
        
        # If topic is specified, filter by topic relevance
        if topic and topic.strip():
            topic_lower = topic.lower()
            scored_docs = []
            
            for doc in subject_docs:
                score = 0
                content_lower = doc["content"].lower()
                keywords = doc.get("keywords", [])
                
                # Score based on topic keyword matches
                topic_words = topic_lower.split()
                for word in topic_words:
                    if word in content_lower:
                        score += content_lower.count(word) * 2  # Boost exact matches
                    if word in keywords:
                        score += 3  # Boost keyword matches
                
                # Score based on content quality
                if len(doc["content"]) > 100:
                    score += 1
                if len(doc["sentences"]) > 5:
                    score += 1
                
                if score > 0:
                    scored_docs.append((doc, score))
            
            # Sort by relevance score and take top documents
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            relevant_docs = [doc for doc, score in scored_docs[:3]]
        
        # If no topic-specific docs or no topic specified, return best general docs
        if not relevant_docs:
            # Sort by content quality (length and sentence count)
            subject_docs.sort(key=lambda x: len(x["content"]) + len(x["sentences"]), reverse=True)
            relevant_docs = subject_docs[:3]
        
        return relevant_docs
    
    def _prepare_content_for_quiz(self, docs: List[Dict], topic: str = "") -> List[Dict]:
        """Prepare content chunks optimized for question generation"""
        content_chunks = []
        
        for doc in docs:
            sentences = doc["sentences"]
            
            # If topic is specified, prioritize sentences containing topic keywords
            if topic:
                topic_words = topic.lower().split()
                prioritized_sentences = []
                other_sentences = []
                
                for sentence in sentences:
                    sentence_lower = sentence.lower()
                    if any(word in sentence_lower for word in topic_words):
                        prioritized_sentences.append(sentence)
                    else:
                        other_sentences.append(sentence)
                
                # Combine with prioritized sentences first
                selected_sentences = prioritized_sentences[:5] + other_sentences[:3]
            else:
                # Select diverse sentences
                selected_sentences = sentences[:8]
            
            for sentence in selected_sentences:
                if len(sentence.strip()) > 30:  # Ensure meaningful content
                    content_chunks.append({
                        "text": sentence.strip(),
                        "source_doc": doc["filename"],
                        "doc_id": doc["id"],
                        "keywords": self._extract_keywords(sentence)
                    })
        
        return content_chunks[:15]  # Limit to prevent overwhelming the LLM
    
    async def _generate_mcq_questions_enhanced(self, content_chunks: List[Dict], 
                                              topic: str, num_questions: int, difficulty: str) -> List[Dict]:
        """Enhanced MCQ generation with better options"""
        questions = []
        
        for i in range(min(num_questions, len(content_chunks))):
            try:
                chunk = content_chunks[i]
                
                # Generate question from content chunk
                if self.llm_handler:
                    question_data = await self._generate_mcq_with_llm(chunk, topic, difficulty)
                else:
                    question_data = self._generate_mcq_fallback(chunk, topic, difficulty, i+1)
                
                if question_data:
                    questions.append(question_data)
                    
            except Exception as e:
                print(f"⚠️ Error generating MCQ {i+1}: {e}")
                # Add fallback question
                fallback_q = self._generate_mcq_fallback(content_chunks[i], topic, difficulty, i+1)
                questions.append(fallback_q)
        
        # Fill remaining questions if needed
        while len(questions) < num_questions:
            index = len(questions)
            chunk = content_chunks[index % len(content_chunks)] if content_chunks else {"text": f"Sample content about {topic}"}
            fallback_q = self._generate_mcq_fallback(chunk, topic, difficulty, index + 1)
            questions.append(fallback_q)
        
        return questions[:num_questions]
    
    async def _generate_mcq_with_llm(self, chunk: Dict, topic: str, difficulty: str) -> Optional[Dict]:
        """Generate MCQ using LLM"""
        try:
            prompt = f"""
            Based on this content: "{chunk['text']}"
            
            Create a {difficulty} difficulty multiple choice question about {topic}.
            
            Format:
            Question: [question text]
            A) [option 1]
            B) [option 2] 
            C) [option 3]
            D) [option 4]
            Correct: [A/B/C/D]
            Explanation: [brief explanation]
            """
            
            response = await self.llm_handler._make_llm_request(prompt, 300)
            
            # Parse the response
            question_data = self._parse_mcq_response(response, chunk)
            return question_data
            
        except Exception as e:
            print(f"⚠️ LLM MCQ generation failed: {e}")
            return None
    
    def _parse_mcq_response(self, response: str, chunk: Dict) -> Dict:
        """Parse LLM response into structured MCQ data"""
        lines = response.strip().split('\n')
        
        question = ""
        options = []
        correct_answer = ""
        explanation = ""
        
        for line in lines:
            line = line.strip()
            if line.startswith("Question:"):
                question = line.replace("Question:", "").strip()
            elif line.startswith(("A)", "B)", "C)", "D)")):
                options.append(line[2:].strip())
            elif line.startswith("Correct:"):
                correct_letter = line.replace("Correct:", "").strip()
                if correct_letter in ["A", "B", "C", "D"] and len(options) > ord(correct_letter) - ord('A'):
                    correct_answer = options[ord(correct_letter) - ord('A')]
            elif line.startswith("Explanation:"):
                explanation = line.replace("Explanation:", "").strip()
        
        # Fallback if parsing failed
        if not question or len(options) < 4:
            return self._generate_mcq_fallback(chunk, "", "medium", 1)
        
        return {
            "id": f"q_{uuid.uuid4().hex[:8]}",
            "question": question,
            "options": options[:4],
            "correct_answer": correct_answer or options[0],
            "explanation": explanation or "Based on the provided content.",
            "difficulty": chunk.get("difficulty", "medium"),
            "source_text": chunk["text"][:100] + "..."
        }
    
    def _generate_mcq_fallback(self, chunk: Dict, topic: str, difficulty: str, q_num: int) -> Dict:
        """Generate fallback MCQ without LLM"""
        text = chunk.get("text", f"Content about {topic}")
        
        # Extract a key concept from the text
        words = text.split()
        key_concept = topic if topic else (words[0] if words else "concept")
        
        question = f"Based on the content, what is mentioned about {key_concept}?"
        
        # Generate plausible options
        correct_answer = text[:50] + "..." if len(text) > 50 else text
        options = [
            correct_answer,
            f"Alternative explanation about {key_concept}",
            f"Different aspect of {key_concept}",
            f"Unrelated information about {key_concept}"
        ]
        
        random.shuffle(options)
        
        return {
            "id": f"q_{q_num}",
            "question": question,
            "options": options,
            "correct_answer": correct_answer,
            "explanation": f"This information is directly stated in the source material.",
            "difficulty": difficulty,
            "source_text": text[:100] + "..."
        }
    
    async def _generate_subjective_questions_enhanced(self, content_chunks: List[Dict], 
                                                     topic: str, num_questions: int, difficulty: str) -> List[Dict]:
        """Enhanced subjective question generation"""
        questions = []
        
        # Group content chunks by themes for better question variety
        question_templates = [
            f"Explain the concept of {{concept}} based on the provided material.",
            f"Discuss the importance of {{concept}} in the context of the given content.",
            f"Analyze the key points about {{concept}} mentioned in the material.",
            f"Describe the process or mechanism of {{concept}} as outlined in the content.",
            f"Compare and contrast different aspects of {{concept}} from the material."
        ]
        
        for i in range(num_questions):
            try:
                chunk_index = i % len(content_chunks)
                chunk = content_chunks[chunk_index]
                
                # Extract concept for question
                concept = self._extract_main_concept(chunk["text"], topic)
                
                # Select appropriate template
                template = question_templates[i % len(question_templates)]
                question_text = template.format(concept=concept)
                
                # Generate key points for answer
                key_points = self._extract_key_points_enhanced(chunk["text"])
                
                # Determine marks based on difficulty
                max_marks = {"easy": 5, "medium": 8, "hard": 12}.get(difficulty, 8)
                time_limit = {"easy": "10 minutes", "medium": "15 minutes", "hard": "20 minutes"}.get(difficulty, "15 minutes")
                
                question = {
                    "id": f"q_{i+1}",
                    "question": question_text,
                    "sample_answer_points": key_points,
                    "max_marks": max_marks,
                    "time_limit": time_limit,
                    "difficulty": difficulty,
                    "source_text": chunk["text"][:200] + "...",
                    "concept": concept
                }
                
                questions.append(question)
                
            except Exception as e:
                print(f"⚠️ Error generating subjective question {i+1}: {e}")
                # Add fallback
                fallback_q = self._generate_subjective_fallback(topic, i+1, difficulty)
                questions.append(fallback_q)
        
        return questions
    
    def _extract_main_concept(self, text: str, topic: str) -> str:
        """Extract the main concept from text for question generation"""
        if topic and topic.strip():
            return topic.strip()
        
        # Extract potential concepts (capitalized words, frequent words)
        words = re.findall(r'\b[A-Z][a-z]+\b', text)
        if words:
            return words[0]
        
        # Fallback to first meaningful word
        meaningful_words = [w for w in text.split() if len(w) > 3]
        return meaningful_words[0] if meaningful_words else "the topic"
    
    def _extract_key_points_enhanced(self, text: str) -> List[str]:
        """Extract key points for subjective answer guidelines"""
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 15]
        
        key_points = []
        for sentence in sentences[:4]:  # Max 4 key points
            # Clean and format the sentence as a key point
            clean_sentence = re.sub(r'\s+', ' ', sentence)
            if len(clean_sentence) > 20:
                key_points.append(clean_sentence)
        
        # Ensure we have at least 2 key points
        while len(key_points) < 2:
            key_points.append("Additional relevant information from the content")
        
        return key_points
    
    def _generate_subjective_fallback(self, topic: str, q_num: int, difficulty: str) -> Dict:
        """Generate fallback subjective question"""
        max_marks = {"easy": 5, "medium": 8, "hard": 12}.get(difficulty, 8)
        time_limit = {"easy": "10 minutes", "medium": "15 minutes", "hard": "20 minutes"}.get(difficulty, "15 minutes")
        
        return {
            "id": f"q_{q_num}",
            "question": f"Explain the key concepts and principles related to {topic}.",
            "sample_answer_points": [
                f"Define {topic} clearly",
                f"Explain the main components or aspects",
                f"Discuss practical applications or examples",
                f"Conclude with the significance or importance"
            ],
            "max_marks": max_marks,
            "time_limit": time_limit,
            "difficulty": difficulty,
            "source_text": f"Fallback question about {topic}"
        }
    
    def _generate_fallback_quiz(self, subject: str, topic: str, quiz_type: str, 
                               num_questions: int, difficulty: str) -> Dict[str, Any]:
        """Generate complete fallback quiz when AI/RAG fails"""
        quiz_id = str(uuid.uuid4())
        
        questions = []
        for i in range(num_questions):
            if quiz_type == "mcq":
                questions.append(self._generate_mcq_fallback(
                    {"text": f"Sample content about {topic or subject}"}, 
                    topic or subject, difficulty, i+1
                ))
            else:
                questions.append(self._generate_subjective_fallback(topic or subject, i+1, difficulty))
        
        return {
            "id": quiz_id,
            "subject": subject,
            "topic": topic or "General",
            "quiz_type": quiz_type,
            "difficulty": difficulty,
            "questions": questions,
            "total_questions": len(questions),
            "created_at": datetime.now().isoformat(),
            "source_documents": ["fallback_generation"],
            "generation_method": "fallback"
        }
    
    async def evaluate_quiz(self, quiz_id: str, answers: Dict[str, str]) -> Dict[str, Any]:
        """Enhanced quiz evaluation with detailed feedback"""
        try:
            if quiz_id not in self.quiz_store:
                print(f"⚠️ Quiz {quiz_id} not found in store")
                return self._generate_fallback_evaluation(quiz_id, answers)
            
            quiz = self.quiz_store[quiz_id]
            evaluation = {
                "quiz_id": quiz_id,
                "total_questions": len(quiz["questions"]),
                "answers_provided": len(answers),
                "results": [],
                "score": 0,
                "percentage": 0,
                "feedback": []
            }
            
            correct_count = 0
            total_possible_score = 0
            
            for question in quiz["questions"]:
                q_id = question["id"]
                user_answer = answers.get(q_id, "")
                
                if quiz["quiz_type"] == "mcq":
                    is_correct = user_answer.lower().strip() == question["correct_answer"].lower().strip()
                    if is_correct:
                        correct_count += 1
                    
                    result = {
                        "question_id": q_id,
                        "question": question["question"],
                        "user_answer": user_answer,
                        "correct_answer": question["correct_answer"],
                        "is_correct": is_correct,
                        "explanation": question.get("explanation", "")
                    }
                    total_possible_score += 1
                    
                else:  # subjective
                    # Enhanced subjective evaluation
                    if self.llm_handler:
                        score = await self._evaluate_subjective_with_llm_enhanced(
                            user_answer, question["sample_answer_points"], question["max_marks"]
                        )
                    else:
                        score = self._evaluate_subjective_fallback(
                            user_answer, question["sample_answer_points"], question["max_marks"]
                        )
                    
                    result = {
                        "question_id": q_id,
                        "question": question["question"],
                        "user_answer": user_answer,
                        "score": score,
                        "max_score": question["max_marks"],
                        "feedback": self._generate_subjective_feedback(score, question["max_marks"])
                    }
                    correct_count += score / question["max_marks"]
                    total_possible_score += 1
                
                evaluation["results"].append(result)
            
            evaluation["score"] = correct_count
            evaluation["percentage"] = (correct_count / total_possible_score) * 100 if total_possible_score > 0 else 0
            
            # Generate enhanced overall feedback
            evaluation["feedback"] = self._generate_overall_feedback(evaluation["percentage"], quiz["subject"])
            
            return evaluation
            
        except Exception as e:
            print(f"❌ Error evaluating quiz: {e}")
            return self._generate_fallback_evaluation(quiz_id, answers)
    
    async def _evaluate_subjective_with_llm_enhanced(self, user_answer: str, 
                                                    sample_points: List[str], max_marks: int) -> int:
        """Enhanced LLM-based subjective evaluation"""
        try:
            if not user_answer.strip():
                return 0
                
            prompt = f"""
            Evaluate this student answer based on the key points that should be covered.
            
            Student Answer:
            {user_answer}
            
            Key Points to Cover:
            {', '.join(sample_points)}
            
            Maximum Marks: {max_marks}
            
            Provide a score from 0 to {max_marks} based on:
            1. Coverage of key points (40%)
            2. Accuracy and depth of explanation (30%)
            3. Clarity and organization (20%)
            4. Use of examples or applications (10%)
            
            Just respond with the numeric score (0-{max_marks}).
            """
            
            response = await self.llm_handler._make_llm_request(prompt, 100)
            
            # Extract numeric score
            score_match = re.search(r'\b(\d+)\b', response)
            if score_match:
                score = int(score_match.group(1))
                return min(max_marks, max(0, score))
            
        except Exception as e:
            print(f"⚠️ Error in LLM evaluation: {e}")
        
        # Fallback to keyword-based evaluation
        return self._evaluate_subjective_fallback(user_answer, sample_points, max_marks)
    
    def _evaluate_subjective_fallback(self, user_answer: str, sample_points: List[str], max_marks: int) -> int:
        """Enhanced fallback subjective evaluation"""
        if not user_answer.strip():
            return 0
        
        user_answer_lower = user_answer.lower()
        score = 0
        
        # Check coverage of key points
        for point in sample_points:
            point_words = [word.lower() for word in point.split() if len(word) > 3]
            matches = sum(1 for word in point_words if word in user_answer_lower)
            
            if matches > 0:
                coverage_ratio = matches / len(point_words)
                score += coverage_ratio
        
        # Bonus for answer length and structure
        word_count = len(user_answer.split())
        if word_count > 50:
            score += 0.5
        if word_count > 100:
            score += 0.5
        
        # Check for structured writing (paragraphs, examples)
        if '\n' in user_answer or '. ' in user_answer:
            score += 0.3
        
        return min(max_marks, round(score))
    
    def _generate_subjective_feedback(self, score: int, max_score: int) -> str:
        """Generate feedback for subjective answers"""
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        if percentage >= 80:
            return f"Excellent answer! You scored {score}/{max_score}. Your response demonstrates strong understanding and covers the key concepts well."
        elif percentage >= 60:
            return f"Good answer! You scored {score}/{max_score}. Consider expanding on some key points for a more comprehensive response."
        elif percentage >= 40:
            return f"Satisfactory answer. You scored {score}/{max_score}. Review the key concepts and try to provide more detailed explanations."
        else:
            return f"Your answer needs improvement. You scored {score}/{max_score}. Focus on covering the main points and providing clearer explanations."
    
    def _generate_overall_feedback(self, percentage: float, subject: str) -> List[str]:
        """Generate enhanced overall feedback"""
        feedback = []
        
        if percentage >= 90:
            feedback.append(f"Outstanding performance! You have mastered {subject} concepts exceptionally well.")
        elif percentage >= 80:
            feedback.append(f"Excellent work! You demonstrate strong understanding of {subject}.")
        elif percentage >= 70:
            feedback.append(f"Good performance! You have a solid grasp of {subject} fundamentals.")
        elif percentage >= 60:
            feedback.append(f"Satisfactory performance. Continue studying {subject} to strengthen your understanding.")
        else:
            feedback.append(f"Consider reviewing {subject} concepts more thoroughly before attempting another quiz.")
        
        # Add specific recommendations
        if percentage < 70:
            feedback.append("Recommendation: Focus on understanding key concepts rather than memorization.")
            feedback.append("Try creating summary notes from your study materials.")
        
        return feedback
    
    def _generate_fallback_evaluation(self, quiz_id: str, answers: Dict[str, str]) -> Dict[str, Any]:
        """Enhanced fallback evaluation"""
        total_questions = len(answers)
        
        # Improved scoring: give credit based on answer quality
        scored_answers = 0
        results = []
        
        for i, (question_id, answer) in enumerate(answers.items()):
            answer_quality = len(answer.strip()) > 10  # Basic quality check
            
            if answer_quality:
                scored_answers += 1
            
            results.append({
                "question_id": question_id,
                "question": f"Question {i+1}",
                "user_answer": answer,
                "correct_answer": "Based on your study materials",
                "is_correct": answer_quality,
                "explanation": "Answer evaluated based on completeness and effort."
            })
        
        percentage = (scored_answers / total_questions) * 100 if total_questions > 0 else 0
        
        return {
            "quiz_id": quiz_id,
            "total_questions": total_questions,
            "answers_provided": len([a for a in answers.values() if a.strip()]),
            "results": results,
            "score": scored_answers,
            "percentage": percentage,
            "feedback": [
                f"You completed the quiz with {percentage:.1f}% quality responses.",
                "This is a basic evaluation. For detailed AI feedback, ensure all AI services are properly configured.",
                "Focus on providing comprehensive answers that demonstrate your understanding."
            ],
            "generation_method": "fallback_evaluation"
        }