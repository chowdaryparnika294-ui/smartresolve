from fastapi import FastAPI,HTTPException
from pydantic import BaseModel,Field
from pathlib import Path
import joblib
app=FastAPI(title='SmartResolve AI')
model_path=Path(__file__).with_name('model.joblib')
model=joblib.load(model_path) if model_path.exists() else None
class Query(BaseModel):
    text:str=Field(min_length=5,max_length=10000)
@app.get('/health')
def health():return {'ok':True,'trained':model is not None}
@app.post('/predict')
def predict(q:Query):
    if model is None:raise HTTPException(status_code=503,detail='Model untrained. Run train.py with approved labeled data.')
    probs=model.predict_proba([q.text])[0]
    idx=probs.argmax()
    return {'category':str(model.classes_[idx]),'confidence':float(probs[idx]),'requiresReview':bool(probs[idx]<.65)}
