import yt_dlp
import json

def get_subs():
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['all'],
        'quiet': True,
        'extractor_args': {'youtube': ['client=ANDROID,IOS']}
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("https://www.youtube.com/watch?v=ZpF6IE0rdxA", download=False)
        subs = info.get('requested_subtitles')
        if subs:
            print("Found subtitle keys:", list(subs.keys()))
        else:
            print("No subs found.")

if __name__ == "__main__":
    get_subs()
