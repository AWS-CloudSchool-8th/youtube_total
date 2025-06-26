# chains/qa_chain.py
from langchain.chains import RetrievalQA
from langchain_aws import ChatBedrock
from retrievers.kb_retriever import get_kb_retriever
from config.aws_config import AWS_REGION, BEDROCK_MODEL_ID

def build_qa_chain():
    llm = ChatBedrock(
        model_id=BEDROCK_MODEL_ID,
        region_name=AWS_REGION,
        model_kwargs={"temperature": 0.7}
    )
    retriever = get_kb_retriever()
    return RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        return_source_documents=True
    )