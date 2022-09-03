import boto3
import os
from datetime import datetime

def handler(event, context):
  try:
    sqs = boto3.resource('sqs')
    sqs_queue_url = os.getenv('DOZER_SQS_URL')
    ref_queue = sqs.Queue(sqs_queue_url)
    ref_queue.send_message(MessageBody=datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f'), MessageGroupId='dozer_api_group')
    return '200'
  except Exception as err:
    print(f"Got error of sending messages to SQS queue, error {err}")
    return False
