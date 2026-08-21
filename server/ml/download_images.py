import urllib.request
import os

mock_dir = 'mock_images'
os.makedirs(mock_dir, exist_ok=True)

# 1. Busy daytime street (high crowd, high light)
urllib.request.urlretrieve("https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80", os.path.join(mock_dir, "street1.jpg"))

# 2. Dark empty street (low crowd, low light)
urllib.request.urlretrieve("https://images.unsplash.com/photo-1478860409698-8707f313ee8b?w=800&q=80", os.path.join(mock_dir, "street2.jpg"))

# 3. Medium busy street evening (medium crowd, medium light)
urllib.request.urlretrieve("https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80", os.path.join(mock_dir, "street3.jpg"))

print("Downloaded mock images")
