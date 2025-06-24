#!/usr/bin/env python3
import requests
import io
from PIL import Image

# 创建一个测试图片
def create_test_image():
    # 创建一个简单的测试图片
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_upload():
    # 测试上传接口
    url = "http://localhost:3000/api/upload"
    
    # 假设的Bearer Token - 请替换为实际的token
    headers = {
        "Authorization": "Bearer your_actual_token_here"
    }
    
    # 创建测试图片
    image_data = create_test_image()
    
    # 准备文件数据
    files = {
        'file': ('test_image.png', image_data, 'image/png')
    }
    
    # 可选参数
    data = {
        'strategyId': '1',  # 使用默认本地存储
        'compress': 'false',
        'quality': '90'
    }
    
    try:
        print("Testing upload with busboy...")
        print(f"URL: {url}")
        print(f"Headers: {headers}")
        print(f"Data: {data}")
        print(f"File size: {len(image_data)} bytes")
        
        response = requests.post(url, files=files, data=data, headers=headers)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("Upload successful!")
            print(f"Message: {result.get('message')}")
            print(f"Total files: {result.get('totalFiles')}")
            print(f"Successful files: {result.get('successfulFiles')}")
            if 'results' in result:
                for file_result in result['results']:
                    print(f"  - {file_result.get('filename')}: {file_result.get('success')}")
                    if file_result.get('success'):
                        print(f"    Share URL: {file_result.get('shareUrl')}")
        else:
            print("Upload failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw response: {response.text}")
                
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Testing upload with busboy...")
    test_upload()
