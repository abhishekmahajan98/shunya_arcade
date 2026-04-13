"""Oil Crisis: Strait Runner plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class OilCrisisGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="oil_crisis",
            name="Oil Crisis: Strait Runner",
            description="Navigate your oil tanker through the Strait of Hormuz blockade! Dodge patrol boats and mines while collecting oil barrels.",
            thumbnail_emoji="🛢️",
            tags=["solo", "arcade", "reflexes"],
            score_label="Barrels",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "initial_speed": 4,
                "barrel_value": 10,
                "mine_spawn_rate": 90,
                "barrel_spawn_rate": 60,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """Score = barrels collected * 10 + distance bonus."""
        barrels = int(raw_result.get("barrels_collected", 0))
        distance = int(raw_result.get("distance", 0))
        return barrels * 10 + distance // 100

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        """Basic sanity check."""
        barrels = raw_result.get("barrels_collected", 0)
        distance = raw_result.get("distance", 0)
        return (
            isinstance(barrels, int)
            and isinstance(distance, int)
            and barrels >= 0
            and distance >= 0
        )
