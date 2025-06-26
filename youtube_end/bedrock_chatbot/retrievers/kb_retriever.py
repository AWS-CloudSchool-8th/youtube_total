# retrievers/kb_retriever.py
import boto3
from langchain_aws import AmazonKnowledgeBasesRetriever, ChatBedrock
from config.aws_config import AWS_REGION, BEDROCK_KB_ID, BEDROCK_MODEL_ID

def get_kb_retriever():
    retriever = AmazonKnowledgeBasesRetriever(
        knowledge_base_id=BEDROCK_KB_ID,
        retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 4}},
        region_name=AWS_REGION
    )
    return retriever

def get_llm():
    client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    llm = ChatBedrock(
        client=client,
        model_id=BEDROCK_MODEL_ID,
        model_kwargs={"temperature": 0.7}
    )
    return llm