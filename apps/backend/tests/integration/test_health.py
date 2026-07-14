async def test_health(client):
  response = await client.get('/health')
  assert response.status_code == 200
  assert response.json() == {'status': 'ok'}


async def test_health_db_disconnected(client, monkeypatch):
  class BrokenEngine:
    def connect(self):
      raise Exception('db unreachable')

  monkeypatch.setattr('app.main.engine', BrokenEngine())

  response = await client.get('/health')
  assert response.status_code == 503
  assert response.json() == {'status': 'error', 'db': 'disconnected'}
