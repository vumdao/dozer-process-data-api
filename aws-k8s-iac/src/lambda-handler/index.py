import boto3
import os
import json
import random
from datetime import datetime


def handler(event, context):
  print(event)
  path = event['requestContext']['http']['path']
  print(f"Received event path {path}")
  if path == '/jobs':
    if push_sqs_msg():
      return '200'
    else:
      return 'failed'
  elif path == '/jobs/stats':
    res, stats = get_stats()
    if res:
      return stats
    else:
      return 'failed'
  elif path == '/jobs/schedule':
    _body = json.loads(event['body'])
    print(f"Receive cron {_body['cron']}")
    if push_event_bridge_rule(_body['cron']):
      return '200'
    else:
      return 'failed'
  else:
    raise Exception(f'{path} is not supported')


def push_sqs_msg():
  '''
  Consume and then delete SQS message
  '''
  try:
    sqs = boto3.resource('sqs')
    sqs_queue_url = os.getenv('DOZER_SQS_URL')
    ref_queue = sqs.Queue(sqs_queue_url)
    msg = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
    print(f"Send SQS message {msg}")
    ref_queue.send_message(MessageBody=msg, MessageGroupId='dozer_api_group')
    return True
  except Exception as err:
    print(f"Got error of sending messages to SQS queue, error {err}")
    return False


def push_event_bridge_rule(cron):
  '''
  Create Event bridge rule which will send SQS message for trigger processor job at schedule
  '''
  try:
    client = boto3.client('events')

    # Conver cron syntax to eventbridge cron
    _cron = cron.split()
    if _cron[4] == '*':
      _cron[4] = '?'
    else:
      _cron[2] = '?'
    _cron.append('*')
    target_cron = ' '.join(_cron)

    print(f'Create eventbridge schedule at {target_cron}')
    rule_name = f'push-sqs-msg-{random.randint(0,2000)}'
    client.put_rule(
      Description=f'Rule to send SQS message at {target_cron} schedule',
      Name=rule_name,
      ScheduleExpression=f'cron({target_cron})',
      State='ENABLED'
    )

    client.put_targets(
      Rule=rule_name,
      Targets=[{
        'Id': 'sin-d1-dozer-sqs.fifo',
        'Arn': os.getenv('DOZER_SQS_ARN'),
        'SqsParameters': {
          'MessageGroupId': 'dozer_api_group'
        }
      }]
    )
    return True
  except Exception as err:
    print(f"Got error of creating event bridge rule, error {err}")
    return False


def get_stats():
  '''
  Read dynamoDB table to get aggregation stats
  '''
  try:
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.getenv('DOZER_DDB_TABLE_NAME'))
    results = dict()
    for stat in ['succeedJob', 'jobRetry', 'failedJob']:
      resp = table.get_item(
          Key={
              'jobState' : stat,
          }
      )
      results[stat] = resp['Item']['hits']
    print(results)
    return True, results
  except Exception as err:
    print(f"Failed to get stats from DDB table, error {err}")
    return False, ''
