import os
import tempfile
from typing import Optional
import PyPDF2
import docx
from PIL import Image
import pytesseract
import io

class DocumentProcessor:
    def __init__(self):
        # Set up Tesseract path for Windows (adjust as needed)
        # You may need to install Tesseract OCR separately
        # Download from: https://github.com/UB-Mannheim/tesseract/wiki
        try:
            # Try common Windows paths
            possible_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                r'C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', ''))
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    print(f"✅ Tesseract found at: {path}")
                    break
            else:
                print("⚠️ Tesseract not found. OCR features may not work.")
                
        except Exception as e:
            print(f"⚠️ Tesseract setup warning: {e}")
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from various file formats"""
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension == '.pdf':
                return self._extract_text_from_pdf(file_path)
            elif file_extension in ['.doc', '.docx']:
                return self._extract_text_from_docx(file_path)
            elif file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                return self._extract_text_from_image(file_path)
            elif file_extension == '.txt':
                return self._extract_text_from_txt(file_path)
            else:
                raise Exception(f"Unsupported file format: {file_extension}")
                
        except Exception as e:
            print(f"Error extracting text from {file_path}: {e}")
            return f"Error extracting text: {str(e)}"
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    text += page_text + "\n"
            
            return self.preprocess_text(text)
            
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return f"PDF extraction failed: {str(e)}"
    
    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return self.preprocess_text(text)
            
        except Exception as e:
            print(f"Error extracting text from DOCX: {e}")
            return f"DOCX extraction failed: {str(e)}"
    
    def _extract_text_from_image(self, file_path: str) -> str:
        """Extract text from image using OCR"""
        try:
            # Open image
            image = Image.open(file_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Use Tesseract to extract text
            text = pytesseract.image_to_string(image, lang='eng')
            
            return self.preprocess_text(text)
            
        except Exception as e:
            print(f"Error extracting text from image using OCR: {e}")
            # Return a helpful message instead of failing
            return f"OCR extraction failed. Please ensure Tesseract is properly installed. Error: {str(e)}"
    
    def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            # Try UTF-8 first
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
            return self.preprocess_text(text)
            
        except UnicodeDecodeError:
            # Try different encodings
            encodings = ['latin-1', 'cp1252', 'iso-8859-1']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        text = file.read()
                    return self.preprocess_text(text)
                except UnicodeDecodeError:
                    continue
            
            return "Text file encoding not supported"
            
        except Exception as e:
            print(f"Error extracting text from TXT: {e}")
            return f"Text extraction failed: {str(e)}"
    
    def preprocess_text(self, text: str) -> str:
        """Clean and preprocess extracted text"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove special characters but keep basic punctuation
        import re
        text = re.sub(r'[^\w\s\.\,\!\?\-\:\;\(\)]', ' ', text)
        
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Remove very short lines (likely artifacts)
        lines = text.split('\n')
        cleaned_lines = [line.strip() for line in lines if len(line.strip()) > 10]
        
        return '\n'.join(cleaned_lines).strip()