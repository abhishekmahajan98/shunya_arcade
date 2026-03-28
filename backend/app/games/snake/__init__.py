"""Snake game plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class SnakeGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="snake",
            name="Snake",
            description="Classic snake game. Eat pellets, grow longer, don't crash!",
            thumbnail_emoji="🐍",
            tags=["solo", "arcade", "classic"],
            score_label="Points",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "grid_size": 20,
                "initial_speed": 150,      # ms per tick
                "speed_increment": 5,      # ms faster per 5 points
                "points_per_pellet": 10,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """Score = pellets eaten * 10, +bonus for surviving longer."""
        pellets = int(raw_result.get("pellets_eaten", 0))
        time_survived = int(raw_result.get("time_survived_s", 0))
        return pellets * 10 + (time_survived // 10)  # bonus point every 10s

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        pellets = raw_result.get("pellets_eaten", 0)
        time_survived = raw_result.get("time_survived_s", 0)
        # Basic sanity: can't eat more than 1 pellet per second on average
        return (
            isinstance(pellets, int)
            and isinstance(time_survived, (int, float))
            and pellets >= 0
            and time_survived >= 0
            and (time_survived == 0 or pellets / time_survived <= 2)
        )
