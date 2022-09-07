import boto3
import os
import json
from datetime import datetime

def handler(event, context):
  try:
    print("Received event: " + json.dumps(event, indent=2))
    sqs = boto3.resource('sqs')
    sqs_queue_url = os.getenv('DOZER_SQS_URL')
    ref_queue = sqs.Queue(sqs_queue_url)
    msg = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
    print(f"Send SQS message {msg}")
    ref_queue.send_message(MessageBody=msg, MessageGroupId='dozer_api_group')
    return '200'
  except Exception as err:
    print(f"Got error of sending messages to SQS queue, error {err}")
    return False
