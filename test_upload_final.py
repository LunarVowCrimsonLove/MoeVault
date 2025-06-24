#!/usr/bin/env python3
"""
测试修复后的上传接口
适配现有数据库结构
"""
import requests
import io
from PIL import Image
import json

def create_test_image():
    """创建一个测试图片"""
    img = Image.new('RGB', (200, 200), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_upload_with_bearer_token():
    """测试使用Bearer Token的上传"""
    url = "http://localhost:3000/api/upload"
    
    # 使用数据库中的API Token
    headers = {
        "Authorization": "Bearer p08GVonIj6FzrdXeQ1G3FRpZukJNWpX8kMG9i5AzQB8RycAQnxQSNPDuio6r6G1H"
    }
    
    # 创建测试图片
    image_data = create_test_image()
    
    # 准备文件数据
    files = {
        'file': ('test_upload.jpg', image_data, 'image/jpeg')
    }
    
    # 测试参数
    data = {
        'strategyId': '1',  # 使用本地存储
        'compress': 'true',
        'quality': '85'
    }
    
    print("=== 测试上传接口（Bearer Token认证）===")
    print(f"URL: {url}")
    print(f"文件大小: {len(image_data)} 字节")
    print(f"参数: {data}")
    
    try:
        response = requests.post(url, files=files, data=data, headers=headers)
        
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 上传成功!")
            print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 验证返回的数据
            if result.get('success'):
                print(f"\n📊 上传统计:")
                print(f"  - 总文件数: {result.get('totalFiles')}")
                print(f"  - 成功文件数: {result.get('successfulFiles')}")
                print(f"  - 使用策略: {result.get('strategy')}")
                
                if 'results' in result and result['results']:
                    for i, file_result in enumerate(result['results']):
                        print(f"\n📁 文件 {i+1}:")
                        print(f"  - 文件名: {file_result.get('filename')}")
                        print(f"  - 成功: {file_result.get('success')}")
                        if file_result.get('success'):
                            print(f"  - 哈希: {file_result.get('hash')}")
                            print(f"  - 分享URL: {file_result.get('shareUrl')}")
                            print(f"  - 尺寸: {file_result.get('width')}x{file_result.get('height')}")
                            print(f"  - 大小: {file_result.get('size')} 字节")
                        else:
                            print(f"  - 错误: {file_result.get('error')}")
        else:
            print("❌ 上传失败!")
            try:
                error_data = response.json()
                print(f"错误信息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"原始响应: {response.text}")
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_upload_without_strategy():
    """测试不指定策略ID的上传（应该使用默认策略）"""
    url = "http://localhost:3000/api/upload"
    
    headers = {
        "Authorization": "Bearer p08GVonIj6FzrdXeQ1G3FRpZukJNWpX8kMG9i5AzQB8RycAQnxQSNPDuio6r6G1H"
    }
    
    image_data = create_test_image()
    
    files = {
        'file': ('test_default_strategy.jpg', image_data, 'image/jpeg')
    }
    
    # 不指定 strategyId，测试默认策略
    data = {}
    
    print("\n=== 测试默认策略上传 ===")
    print("不指定 strategyId，应该使用默认的本地存储")
    
    try:
        response = requests.post(url, files=files, data=data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 默认策略上传成功!")
            print(f"使用策略: {result.get('strategy')}")
        else:
            print("❌ 默认策略上传失败!")
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_upload_with_album():
    """测试上传到相册"""
    url = "http://localhost:3000/api/upload"
    
    headers = {
        "Authorization": "Bearer p08GVonIj6FzrdXeQ1G3FRpZukJNWpX8kMG9i5AzQB8RycAQnxQSNPDuio6r6G1H"
    }
    
    image_data = create_test_image()
    
    files = {
        'file': ('test_album_upload.jpg', image_data, 'image/jpeg')
    }
    
    # 使用数据库中存在的相册ID
    data = {
        'albumId': '2',  # 小汐の私有相册
        'strategyId': '1'
    }
    
    print("\n=== 测试相册上传 ===")
    print("上传到相册ID: 2")
    
    try:
        response = requests.post(url, files=files, data=data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 相册上传成功!")
            print(f"使用策略: {result.get('strategy')}")
        else:
            print("❌ 相册上传失败!")
            print(f"状态码: {response.status_code}")
            print(f"响应: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

if __name__ == "__main__":
    print("🚀 开始测试上传接口...")
    
    # 测试1: 基本Bearer Token上传
    test_upload_with_bearer_token()
    
    # 测试2: 默认策略上传
    test_upload_without_strategy()
    
    # 测试3: 相册上传
    test_upload_with_album()
    
    print("\n🎉 测试完成!")
