from django.db import models

class Player(models.Model):
    name = models.CharField(max_length=100, unique=True)
    x = models.IntegerField()
    y = models.IntegerField()
    character = models.CharField(max_length=100, default='Blazer')
    zone = models.CharField(max_length=10, default='North')
    attack = models.IntegerField(default=30)
    hp = models.IntegerField(default=100)
    def __str__(self):
        return f'{self.name} ({self.character}) at ({self.x}, {self.y})'
