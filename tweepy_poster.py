#!/usr/bin/env python3
import os
import sys
import tweepy
from pathlib import Path

# Load environment variables manually or via python-dotenv if available
dotenv_path = Path(__file__).resolve().parent / ".env"

def load_env():
    env_vars = {}
    if dotenv_path.exists():
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                # Strip optional quotes
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
    return env_vars

def update_env(new_tweet_id):
    lines = []
    found = False
    key_to_find = "TWITTER_LAST_THREAD_TWEET_ID"
    
    if dotenv_path.exists():
        with open(dotenv_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith(key_to_find + "=") or stripped.startswith(f"# {key_to_find}=") or stripped.startswith(f"#{key_to_find}="):
                lines[i] = f"{key_to_find}={new_tweet_id}\n"
                found = True
                break
                
    if not found:
        lines.append(f"\n{key_to_find}={new_tweet_id}\n")
        
    with open(dotenv_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

def main():
    if len(sys.argv) < 2:
        print("Error: Missing tweet text argument.", file=sys.stderr)
        print("Usage: python tweepy_poster.py \"<tweet_text>\"", file=sys.stderr)
        sys.exit(1)
        
    tweet_text = sys.argv[1]
    
    # Load configuration
    env = load_env()
    api_key = env.get("TWITTER_API_KEY")
    api_secret = env.get("TWITTER_API_SECRET")
    access_token = env.get("TWITTER_ACCESS_TOKEN")
    access_token_secret = env.get("TWITTER_ACCESS_TOKEN_SECRET")
    last_tweet_id = env.get("TWITTER_LAST_THREAD_TWEET_ID")
    
    if not all([api_key, api_secret, access_token, access_token_secret]):
        print("Error: Twitter environment credentials not fully set in .env file.", file=sys.stderr)
        print("Required: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET", file=sys.stderr)
        sys.exit(1)
        
    try:
        # Initialize Tweepy Client (API v2)
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        
        # Decide whether to reply or start thread
        is_reply = False
        if last_tweet_id and last_tweet_id.strip() not in ["", "your_last_tweet_id", "None"]:
            is_reply = True
            
        if is_reply:
            print(f"Replying to tweet ID: {last_tweet_id}...")
            response = client.create_tweet(
                text=tweet_text,
                in_reply_to_tweet_id=int(last_tweet_id)
            )
        else:
            print("Posting standalone tweet (starting a new thread)...")
            response = client.create_tweet(text=tweet_text)
            
        new_tweet_id = response.data["id"]
        print(f"SUCCESS: Tweet posted! New ID: {new_tweet_id}")
        
        # Update .env file
        update_env(new_tweet_id)
        print(f"Updated TWITTER_LAST_THREAD_TWEET_ID in .env to: {new_tweet_id}")
        
        # Write only the new tweet ID to stdout on its own line for Next.js to parse
        print(f"NEW_TWEET_ID:{new_tweet_id}")
        
    except Exception as e:
        print(f"Twitter API Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
