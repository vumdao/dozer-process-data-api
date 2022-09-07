use rand::Rng; // 0.8.0
use tokio::time::{sleep, Duration};
use aws_sdk_sqs::{Client, Error};
use std::env;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::model::AttributeValue;
use tokio_stream::StreamExt;


#[tokio::main]
async fn main() {
    env_logger::init();

    println!("Start process job");

    receive_delete_sqs_msg().await;

    let mut counter = 0;
    let mut rng = rand::thread_rng();
    let result = loop {
        counter += 1;
        if counter % 100 == 0 {
            println!("processed {} records", counter);
            sleep(Duration::from_millis(100)).await;
        }
        if rng.gen_range(0..5000) == 0 {
            update_item("failedJob").await;
            panic!("Encountered error {}", counter);
        }
        if counter == 5000 {
            break counter;
        }
    };
    assert_eq!(result, 5000);
    update_item("succeedJob").await;
}

async fn update_item(jobState: &str) -> Result<(), aws_sdk_dynamodb::Error> {
    let region_provider = RegionProviderChain::default_provider().or_else("ap-southeast-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let ddb_client = aws_sdk_dynamodb::Client::new(&config);
    let table = env::var("AWS_DDB_TABLE").expect("$AWS_DDB_TABLE is not set");

    let job_state = AttributeValue::S(jobState.into());

    let request = ddb_client
        .update_item()
        .table_name(table)
        .key("jobState", job_state)
        .update_expression("ADD hits :incr")
        .expression_attribute_values(":incr", AttributeValue::N(1.to_string()));

    println!("Executing request [{:?}] to add item...", request);

    request.send().await?;

    println!("Added jobState {}", jobState);

    Ok(())
}

async fn receive_delete_sqs_msg() -> Result<(), Error> {
    let region_provider = RegionProviderChain::default_provider().or_else("ap-southeast-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let sqs_client = Client::new(&config);
    let queue_url = env::var("AWS_SQS_URL").expect("$AWS_SQS_URL is not set");

    println!("Consume message from {}", queue_url);

    let rcv_message_output = sqs_client.receive_message().queue_url(queue_url).send().await?;

    let messages = rcv_message_output.messages().unwrap_or_default();

    if messages.len() == 1 {
        for msg in messages
        {
            println!(
                "Received message '{}' with id {}",
                msg.body.clone().unwrap(),
                msg.message_id.clone().unwrap()
            );
            println!("Delete message");
            sqs_client.delete_message()
                .queue_url(env::var("AWS_SQS_URL").expect("$AWS_SQS_URL is not set"))
                .receipt_handle(msg.receipt_handle.clone().unwrap())
                .send()
                .await;
        }
    } else {
        update_item("jobRetry").await;
    }

    Ok(())
}