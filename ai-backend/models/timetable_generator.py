from typing import List, Dict, Any
from datetime import datetime, timedelta
import json
import random

class TimetableGenerator:
    def __init__(self, llm_handler):
        self.llm_handler = llm_handler
    
    async def generate_timetable(self, subjects: List[Any], days_available: int, 
                          hours_per_day: int, time_slots: List[str]) -> Dict[str, Any]:
        """Generate a detailed study timetable with LLM assistance"""
        try:
            # Convert subjects to dictionaries if they're objects
            subjects_data = []
            for subject in subjects:
                if hasattr(subject, '__dict__'):
                    subject_dict = {
                        'name': subject.name,
                        'topics': subject.topics,
                        'weightage': subject.weightage or {}
                    }
                else:
                    subject_dict = subject
                subjects_data.append(subject_dict)
            
            # Get LLM recommendations for study plan
            study_recommendations = await self.llm_handler.generate_study_plan_recommendations(
                subjects_data, days_available, hours_per_day
            )
            
            # Calculate total hours and distribute among subjects
            total_hours = days_available * hours_per_day
            
            # Calculate hours per subject based on weightage
            subject_hours = self._calculate_subject_hours(subjects_data, total_hours)
            
            # Generate daily schedule
            daily_schedule = self._generate_daily_schedule(
                subjects_data, subject_hours, days_available, hours_per_day, time_slots
            )
            
            # Create timetable structure
            timetable = {
                "id": f"tt_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "created_at": datetime.now().isoformat(),
                "total_days": days_available,
                "hours_per_day": hours_per_day,
                "total_hours": total_hours,
                "subjects": subjects_data,
                "subject_hours": subject_hours,
                "daily_schedule": daily_schedule,
                "ai_recommendations": study_recommendations,
                "completion_status": {subject['name']: {"completed": 0, "total": len(subject['topics'])} 
                                   for subject in subjects_data}
            }
            
            return timetable
            
        except Exception as e:
            print(f"Error generating timetable: {e}")
            raise e
    
    def _calculate_subject_hours(self, subjects: List[Dict], total_hours: int) -> Dict[str, int]:
        """Calculate hours allocation for each subject"""
        subject_hours = {}
        
        # If no weightage provided, distribute equally
        if not any(subject.get('weightage') for subject in subjects):
            hours_per_subject = total_hours // len(subjects)
            remainder = total_hours % len(subjects)
            
            for i, subject in enumerate(subjects):
                subject_hours[subject['name']] = hours_per_subject + (1 if i < remainder else 0)
        else:
            # Use weightage to distribute hours
            total_weight = 0
            for subject in subjects:
                if subject.get('weightage'):
                    total_weight += sum(subject['weightage'].values())
                else:
                    total_weight += 1  # Default weight
            
            for subject in subjects:
                if subject.get('weightage'):
                    weight = sum(subject['weightage'].values())
                else:
                    weight = 1
                
                subject_hours[subject['name']] = int((weight / total_weight) * total_hours)
        
        return subject_hours
    
    def _generate_daily_schedule(self, subjects: List[Dict], subject_hours: Dict[str, int],
                                days: int, hours_per_day: int, time_slots: List[str]) -> List[Dict]:
        """Generate day-by-day schedule"""
        daily_schedule = []
        
        # Create topic pool with estimated hours
        topic_pool = []
        for subject in subjects:
            subject_total_hours = subject_hours[subject['name']]
            topics = subject['topics']
            hours_per_topic = max(1, subject_total_hours // len(topics))
            
            for topic in topics:
                # Adjust hours based on topic weightage if available
                if subject.get('weightage') and topic in subject['weightage']:
                    topic_hours = int(hours_per_topic * subject['weightage'][topic])
                else:
                    topic_hours = hours_per_topic
                
                topic_pool.append({
                    'subject': subject['name'],
                    'topic': topic,
                    'estimated_hours': max(1, topic_hours),
                    'completed': False
                })
        
        # Generate daily schedules
        for day in range(days):
            date = datetime.now() + timedelta(days=day)
            day_schedule = {
                'day': day + 1,
                'date': date.strftime('%Y-%m-%d'),
                'sessions': []
            }
            
            available_hours = hours_per_day
            session_count = 0
            
            while available_hours > 0 and topic_pool:
                # Find next uncompleted topic
                uncompleted_topics = [t for t in topic_pool if not t['completed']]
                if not uncompleted_topics:
                    break
                
                # Select topic (round-robin or priority-based)
                topic = uncompleted_topics[session_count % len(uncompleted_topics)]
                
                # Determine session duration
                session_hours = min(available_hours, 2, topic['estimated_hours'])  # Max 2 hours per session
                
                # Create time slot
                if session_count < len(time_slots):
                    time_slot = time_slots[session_count]
                else:
                    time_slot = f"{9 + session_count}:00-{9 + session_count + session_hours}:00"
                
                session = {
                    'session_id': f"s_{day+1}_{session_count+1}",
                    'subject': topic['subject'],
                    'topic': topic['topic'],
                    'duration_hours': session_hours,
                    'time_slot': time_slot,
                    'completed': False,
                    'notes': ""
                }
                
                day_schedule['sessions'].append(session)
                
                # Update topic hours and availability
                topic['estimated_hours'] -= session_hours
                if topic['estimated_hours'] <= 0:
                    topic['completed'] = True
                
                available_hours -= session_hours
                session_count += 1
                
                # Limit sessions per day
                if session_count >= 4:  # Max 4 sessions per day
                    break
            
            daily_schedule.append(day_schedule)
        
        return daily_schedule
    
    async def reschedule_timetable(self, completed_topics: List[str], remaining_days: int) -> Dict[str, Any]:
        """Reschedule timetable based on completed topics with LLM suggestions"""
        try:
            # Get LLM recommendations for rescheduling
            reschedule_prompt = f"""
            A student has completed these topics: {', '.join(completed_topics)}
            They have {remaining_days} days remaining for exam preparation.
            
            Provide 3-4 specific recommendations for optimizing their remaining study time:
            1. Priority topics to focus on
            2. Time management strategies
            3. Study techniques for last-minute preparation
            4. Stress management tips
            
            Keep recommendations practical and actionable.
            """
            
            recommendations = await self.llm_handler._make_llm_request(reschedule_prompt, 300)
            
            rescheduled = {
                "id": f"rescheduled_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "created_at": datetime.now().isoformat(),
                "remaining_days": remaining_days,
                "completed_topics": completed_topics,
                "ai_recommendations": recommendations,
                "status": "rescheduled",
                "next_actions": [
                    "Review completed topics for retention",
                    "Focus on high-priority remaining topics",
                    "Increase daily study hours if possible",
                    "Schedule regular review sessions"
                ]
            }
            
            return rescheduled
            
        except Exception as e:
            print(f"Error rescheduling timetable: {e}")
            # Fallback without LLM
            return {
                "id": f"rescheduled_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "created_at": datetime.now().isoformat(),
                "remaining_days": remaining_days,
                "completed_topics": completed_topics,
                "recommendations": [
                    "Focus on high-priority topics first",
                    "Increase daily study hours if possible",
                    "Use active recall techniques for faster learning",
                    "Take shorter breaks to maximize study time"
                ],
                "status": "rescheduled"
            }