from pydantic import BaseModel
from typing import Optional


class Question(BaseModel):
    """Question model"""
    id: int
    text: str
    image_url: Optional[str] = None
    hint: Optional[str] = None
    answer: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "text": "Wie viele Kontinente gibt es?",
                "image_url": None,
                "hint": "Es sind mehr als 5",
                "answer": 7.0
            }
        }
