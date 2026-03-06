from beacon_sdk import trace
import anthropic
import os
import sys
sys.path.insert(0, 'sdk')

os.environ['BEACON_EMITTER'] = 'kinesis'
os.environ['BEACON_KINESIS_STREAM'] = 'beacon-traces'
os.environ['AWS_ENDPOINT_URL'] = 'http://localhost:4566'
os.environ['AWS_ACCESS_KEY_ID'] = 'test'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'test'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'


client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])


@trace(model='claude-sonnet-4-20250514', prompt_version='v1', score_hallucination_flag=True)
def ask(question: str):
    response = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': question}]
    )
    return response


print("Chat with Claude (every message is traced in Beacon)")
print("Type 'quit' to exit\n")

while True:
    user_input = input("You: ").strip()
    if user_input.lower() == 'quit':
        break
    result = ask(user_input)
    print(f"Claude: {result.content[0].text}\n")
