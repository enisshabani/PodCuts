import yt_dlp
import requests

def get_subs():
    # Fetch free proxies
    try:
        res = requests.get('https://proxylist.geonode.com/api/proxy-list?limit=10&page=1&sort_by=lastChecked&sort_type=desc&protocols=http,https')
        proxies = res.json()['data']
        for p in proxies:
            proxy_url = f"{p['protocols'][0]}://{p['ip']}:{p['port']}"
            print(f"Trying proxy: {proxy_url}")
            ydl_opts = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['all'],
                'quiet': True,
                'proxy': proxy_url,
                'extractor_args': {'youtube': {'player_client': ['android', 'web'], 'client': ['android', 'web']}}
            }
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info("https://www.youtube.com/watch?v=ZpF6IE0rdxA", download=False)
                    subs = info.get('requested_subtitles')
                    if subs:
                        print("Success with proxy!", list(subs.keys()))
                        return
            except Exception as e:
                print("Failed with proxy:", e)
    except Exception as e:
        print("Failed to fetch proxies", e)

if __name__ == "__main__":
    get_subs()
