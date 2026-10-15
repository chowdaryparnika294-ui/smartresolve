import argparse,json
from pathlib import Path
import pandas as pd,joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report,confusion_matrix
p=argparse.ArgumentParser();p.add_argument('--data',required=True,help='CSV with text,category columns');p.add_argument('--output',default=str(Path(__file__).with_name('model.joblib')));a=p.parse_args()
df=pd.read_csv(a.data).dropna(subset=['text','category']);df['text']=df.text.astype(str).str.replace(r'\b[\w.%-]+@[\w.-]+\.[A-Za-z]{2,}\b','[EMAIL]',regex=True).str.replace(r'\b\d{10,}\b','[NUMBER]',regex=True).str.strip();df=df[df.text.str.len().between(15,5000)].drop_duplicates(subset=['text']);counts=df.category.value_counts();df=df[df.category.isin(counts[counts>=3].index)];assert df.category.nunique()>=2,'Need at least two categories with three distinct examples each';train,test=train_test_split(df,test_size=.2,random_state=42,stratify=df.category);model=Pipeline([('tfidf',TfidfVectorizer(ngram_range=(1,2),min_df=1,max_features=50000,sublinear_tf=True)),('classifier',LogisticRegression(max_iter=1500,class_weight='balanced'))]);model.fit(train.text,train.category);pred=model.predict(test.text);report=classification_report(test.category,pred,output_dict=True,zero_division=0);print(classification_report(test.category,pred,zero_division=0));print('Confusion matrix:',confusion_matrix(test.category,pred,labels=model.classes_).tolist());Path(a.output).parent.mkdir(parents=True,exist_ok=True);joblib.dump(model,a.output);Path(a.output+'.metrics.json').write_text(json.dumps({'accuracy':report['accuracy'],'macro_f1':report['macro avg']['f1-score'],'macro_precision':report['macro avg']['precision'],'macro_recall':report['macro avg']['recall'],'labels':model.classes_.tolist()},indent=2));print('Model saved:',a.output)
