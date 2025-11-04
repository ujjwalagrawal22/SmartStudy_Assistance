import os
import re
import json
import asyncio
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMHandler:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "groq").lower()
        self.client = None
        self.model = os.getenv("DEFAULT_MODEL", "llama3-8b-8192")
        self.max_tokens = int(os.getenv("MAX_TOKENS", "1024"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the appropriate LLM client based on provider"""
        try:
            if self.provider == "groq":
                try:
                    from groq import Groq
                    api_key = os.getenv("GROQ_API_KEY")
                    if not api_key:
                        raise ValueError("GROQ_API_KEY not found in environment variables")
                    
                    # Fixed initialization - remove proxies parameter
                    self.client = Groq(api_key=api_key)
                    print(f"✅ Groq client initialized with model: {self.model}")
                    
                except Exception as groq_error:
                    print(f"❌ Error initializing Groq: {groq_error}")
                    self.client = None
                    
            elif self.provider == "together":
                try:
                    import openai
                    api_key = os.getenv("TOGETHER_API_KEY")
                    if not api_key:
                        raise ValueError("TOGETHER_API_KEY not found in environment variables")
                    self.client = openai.OpenAI(
                        api_key=api_key,
                        base_url="https://api.together.xyz/v1"
                    )
                    self.model = "meta-llama/Llama-2-7b-chat-hf"
                    print(f"✅ Together AI client initialized with model: {self.model}")
                except Exception as together_error:
                    print(f"❌ Error initializing Together AI: {together_error}")
                    self.client = None
                    
            elif self.provider == "huggingface":
                try:
                    import requests
                    self.api_key = os.getenv("HUGGINGFACE_API_KEY")
                    if not self.api_key:
                        raise ValueError("HUGGINGFACE_API_KEY not found in environment variables")
                    self.base_url = "https://api-inference.huggingface.co/models/"
                    self.model = "microsoft/DialoGPT-large"
                    print(f"✅ Hugging Face client initialized with model: {self.model}")
                except Exception as hf_error:
                    print(f"❌ Error initializing Hugging Face: {hf_error}")
                    self.client = None
                    
            elif self.provider == "cohere":
                try:
                    import cohere
                    api_key = os.getenv("COHERE_API_KEY")
                    if not api_key:
                        raise ValueError("COHERE_API_KEY not found in environment variables")
                    self.client = cohere.Client(api_key)
                    self.model = "command-light"
                    print(f"✅ Cohere client initialized with model: {self.model}")
                except Exception as cohere_error:
                    print(f"❌ Error initializing Cohere: {cohere_error}")
                    self.client = None
                    
            else:
                print(f"❌ Unsupported LLM provider: {self.provider}")
                self.client = None
                
        except Exception as e:
            print(f"❌ Error initializing LLM client: {e}")
            self.client = None
    
    def test_connection(self) -> str:
        """Test the LLM connection"""
        try:
            if not self.client:
                return "Client not initialized"
            
            if self.provider == "groq":
                response = self.client.chat.completions.create(
                    messages=[{"role": "user", "content": "Hello"}],
                    model=self.model,
                    max_tokens=10
                )
                return response.choices[0].message.content
                
            elif self.provider == "together":
                response = self.client.chat.completions.create(
                    messages=[{"role": "user", "content": "Hello"}],
                    model=self.model,
                    max_tokens=10
                )
                return response.choices[0].message.content
                
            elif self.provider == "huggingface":
                import requests
                response = requests.post(
                    f"{self.base_url}{self.model}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"inputs": "Hello", "parameters": {"max_length": 10}}
                )
                return "Connected" if response.status_code == 200 else "Error"
                
            elif self.provider == "cohere":
                response = self.client.generate(prompt="Hello", max_tokens=10)
                return response.generations[0].text
                
        except Exception as e:
            return f"Connection test failed: {str(e)}"
    
    async def _make_llm_request(self, prompt: str, max_tokens: Optional[int] = None) -> str:
        """Make a request to the LLM API"""
        try:
            max_tokens = max_tokens or self.max_tokens
            
            if self.provider == "groq" and self.client:
                response = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for educational purposes."},
                        {"role": "user", "content": prompt}
                    ],
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=self.temperature
                )
                return response.choices[0].message.content
                
            elif self.provider == "together" and self.client:
                response = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for educational purposes."},
                        {"role": "user", "content": prompt}
                    ],
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=self.temperature
                )
                return response.choices[0].message.content
                
            elif self.provider == "huggingface":
                import requests
                response = requests.post(
                    f"{self.base_url}{self.model}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_length": max_tokens,
                            "temperature": self.temperature,
                            "return_full_text": False
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        return result[0].get("generated_text", "")
                    return str(result)
                else:
                    raise Exception(f"HuggingFace API error: {response.status_code}")
                
            elif self.provider == "cohere" and self.client:
                response = self.client.generate(
                    prompt=prompt,
                    max_tokens=max_tokens,
                    temperature=self.temperature
                )
                return response.generations[0].text
                
            else:
                # Fallback response when no LLM is available
                return self._generate_fallback_response(prompt)
                
        except Exception as e:
            print(f"❌ Error making LLM request: {e}")
            return self._generate_fallback_response(prompt)
    
    def _generate_fallback_response(self, prompt: str) -> str:
        """Generate a fallback response when LLM is unavailable"""
        # Simple pattern matching for common educational prompts
        prompt_lower = prompt.lower()
        
        if "quiz" in prompt_lower or "question" in prompt_lower:
            return "Question: What is the main concept discussed in the content?\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nCorrect: A\nExplanation: Based on the provided content."
        
        elif "timetable" in prompt_lower or "schedule" in prompt_lower:
            return "Create a balanced study schedule with regular breaks. Prioritize difficult subjects during your peak energy hours. Include review sessions for better retention."
        
        elif "study tips" in prompt_lower:
            return "1. Use active recall techniques\n2. Take regular breaks\n3. Practice problems regularly\n4. Create summary notes\n5. Stay consistent with your schedule"
        
        elif "evaluate" in prompt_lower or "score" in prompt_lower:
            return "5"  # Default score for evaluation
        
        else:
            return "This is a helpful response about educational content. For detailed AI-powered responses, please ensure your LLM service is properly configured."
    
    async def analyze_question_papers(self, text: str) -> Dict[str, float]:
        """Analyze question papers using LLM or fallback analysis"""
        try:
            if self.client:
                prompt = f"""
                Analyze the following question paper content and identify the most important topics with their weightage (importance score from 0-1).
                
                Content:
                {text[:2000]}...
                
                Please respond with a JSON object where keys are topic names and values are importance scores (0-1).
                Focus on identifying specific subjects, concepts, and topics that appear frequently or seem important.
                
                Example format:
                {{"mathematics": 0.3, "physics": 0.4, "chemistry": 0.3}}
                
                Response:
                """
                
                response = await self._make_llm_request(prompt, 500)
                
                # Try to extract JSON from response
                try:
                    json_match = re.search(r'\{.*\}', response, re.DOTALL)
                    if json_match:
                        topic_weights = json.loads(json_match.group())
                        return topic_weights
                except json.JSONDecodeError:
                    pass
            
            # Fallback: extract topics from text using keyword analysis
            return self._extract_topics_from_text(text)
            
        except Exception as e:
            print(f"❌ Error in question paper analysis: {e}")
            return self._extract_topics_from_text(text)
    
    def _extract_topics_from_text(self, text: str) -> Dict[str, float]:
        """Fallback method to extract topics using keyword analysis"""
        topic_keywords = {
            "mathematics": ["equation", "formula", "calculate", "solve", "derivative", "integral"],
            "physics": ["force", "energy", "motion", "velocity", "wave", "electricity"],
            "chemistry": ["reaction", "molecule", "atom", "bond", "element", "compound"],
            "biology": ["cell", "organism", "evolution", "genetics", "ecosystem", "protein"],
            "computer_science": ["algorithm", "data", "programming", "software", "network"],
            "history": ["war", "revolution", "empire", "civilization", "century"],
            "literature": ["poem", "novel", "story", "author", "character", "theme"]
        }
        
        text_lower = text.lower()
        topic_scores = {}
        
        for topic, keywords in topic_keywords.items():
            score = sum(text_lower.count(keyword) for keyword in keywords)
            if score > 0:
                topic_scores[topic] = score / len(text.split()) * 1000
        
        # Normalize scores
        total_score = sum(topic_scores.values())
        if total_score > 0:
            topic_scores = {topic: score/total_score for topic, score in topic_scores.items()}
        
        return topic_scores or {"general": 1.0}
    
    async def generate_study_tips(self, subject: str, topic: Optional[str] = None) -> List[str]:
        """Generate study tips using LLM or fallback tips"""
        try:
            if self.client:
                topic_text = f" specifically for {topic}" if topic else ""
                
                prompt = f"""
                Generate 5 effective study tips for {subject}{topic_text}.
                Make them practical, actionable, and specific to the subject.
                
                Format your response as a numbered list:
                1. [tip 1]
                2. [tip 2]
                3. [tip 3]
                4. [tip 4]
                5. [tip 5]
                """
                
                response = await self._make_llm_request(prompt, 400)
                
                # Extract tips from response
                tips = []
                lines = response.split('\n')
                for line in lines:
                    line = line.strip()
                    if re.match(r'^\d+\.', line):
                        tip = re.sub(r'^\d+\.\s*', '', line)
                        if tip:
                            tips.append(tip)
                
                # Fallback if extraction failed
                if not tips:
                    tips = self._get_fallback_study_tips(subject)
                
                return tips[:5]
            else:
                return self._get_fallback_study_tips(subject)
                
        except Exception as e:
            print(f"❌ Error generating study tips: {e}")
            return self._get_fallback_study_tips(subject)
    
    def _get_fallback_study_tips(self, subject: str) -> List[str]:
        """Fallback study tips if LLM fails"""
        return [
            f"Create a structured study schedule for {subject}",
            "Use active recall techniques instead of passive reading",
            "Practice problems regularly to reinforce concepts",
            "Take breaks every 45-60 minutes to maintain focus",
            "Connect new concepts to previously learned material"
        ]
    
    async def generate_study_plan_recommendations(self, subjects: List[Dict], days: int, hours_per_day: int) -> str:
        """Generate study plan recommendations using LLM or fallback"""
        try:
            if self.client:
                subjects_text = ", ".join([s.get('name', str(s)) for s in subjects])
                
                prompt = f"""
                Create a study plan recommendation for the following scenario:
                - Subjects: {subjects_text}
                - Available days: {days}
                - Hours per day: {hours_per_day}
                - Total study hours: {days * hours_per_day}
                
                Provide practical advice on:
                1. How to distribute time among subjects
                2. Daily study routine suggestions
                3. Break scheduling
                4. Review strategies
                5. Tips for maintaining motivation
                
                Keep the response concise and actionable.
                """
                
                response = await self._make_llm_request(prompt, 500)
                return response
            else:
                return self._get_fallback_study_plan(subjects, days, hours_per_day)
                
        except Exception as e:
            print(f"❌ Error generating study plan: {e}")
            return self._get_fallback_study_plan(subjects, days, hours_per_day)
    
    def _get_fallback_study_plan(self, subjects: List[Dict], days: int, hours_per_day: int) -> str:
        """Fallback study plan if LLM fails"""
        total_hours = days * hours_per_day
        hours_per_subject = total_hours // len(subjects)
        
        plan = f"Study Plan for {days} days:\n"
        plan += f"Total study time: {total_hours} hours\n\n"
        
        for subject in subjects:
            subject_name = subject.get('name', str(subject))
            plan += f"• {subject_name}: {hours_per_subject} hours\n"
        
        plan += "\nRecommendations:\n"
        plan += "• Study difficult subjects when you're most alert\n"
        plan += "• Take 15-minute breaks every hour\n"
        plan += "• Review previous day's material before starting new topics\n"
        plan += "• Use active learning techniques like summarizing and teaching\n"
        
        return plan