import httpx
import json

# Create a simple test request
async def test():
    async with httpx.AsyncClient() as client:
        # Test without auth first
        try:
            response = await client.get('http://localhost:5000/api/appointments')
            print(f"All appointments: {response.status_code}")
            print(json.dumps(response.json(), indent=2))
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    import asyncio
    asyncio.run(test())
