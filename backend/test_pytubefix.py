from pytubefix import YouTube

def get_subs():
    url = "https://www.youtube.com/watch?v=ZpF6IE0rdxA"
    yt = YouTube(url, use_po_token=True)
    # Get captions
    captions = yt.captions
    if not captions:
        print("No captions found.")
        return
    for c in captions:
        print(f"Caption: {c.code}")
    # Get the first english or auto-english caption
    caption = None
    for code in ['en', 'a.en']:
        if code in captions:
            caption = captions[code]
            break
    if caption:
        print("Caption found!")
        print(caption.generate_srt_captions()[:500])

if __name__ == "__main__":
    get_subs()
