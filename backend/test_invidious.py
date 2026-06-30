import requests
import json

def test_invidious():
    try:
        # Get list of instances
        res = requests.get('https://api.invidious.io/instances.json?sort_by=health')
        instances = res.json()
        
        valid_urls = []
        for instance in instances:
            if instance[1].get('type') == 'https' and instance[1].get('api') == True:
                valid_urls.append(instance[1]['uri'])
        
        print(f"Testing {len(valid_urls)} instances...")
        
        video_id = "AbARdcqmWTY"
        
        for url in valid_urls:
            api_url = f"{url}/api/v1/captions/{video_id}"
            try:
                print(f"Trying {api_url}")
                captions_res = requests.get(api_url, timeout=3)
                if captions_res.status_code == 200:
                    data = captions_res.json()
                    if data:
                        print("SUCCESS!", url)
                        print(data)
                        return url
            except:
                pass
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_invidious()
