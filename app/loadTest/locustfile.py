from locust import HttpUser, task


class User(HttpUser):
    @task
    def mainPage(self):
        self.client.get("/")