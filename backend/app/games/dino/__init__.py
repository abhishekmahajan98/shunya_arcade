"""Dino Run game plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class DinoGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="dino",
            name="Dino Run",
            description="Jump over cacti and dodge pterodactyls. How far can you go?",
            thumbnail_emoji="🦕",
            tags=["solo", "arcade", "endless"],
            score_label="Distance",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "initial_speed": 6,        # px/frame
                "speed_increment": 0.001,  # increases over time
                "gravity": 0.6,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """Score = distance traveled (naturally increases over time)."""
        return max(0, int(raw_result.get("distance", 0)))

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        distance = raw_result.get("distance", 0)
        time_s = raw_result.get("time_s", 0)
        # Max realistic speed is ~2000 distance/second
        return (
            isinstance(distance, (int, float))
            and distance >= 0
            and (time_s == 0 or distance / time_s <= 2000)
        )
