"""Pop the AI Bubble plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class BubbleGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="bubble",
            name="Pop the AI Bubble",
            description="Pop AI buzzwords to score points, but avoid the Hallucinations!",
            thumbnail_emoji="🫧",
            tags=["casual", "reflexes", "clicking"],
            score_label="Points",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "game_duration_s": 60,
                "spawn_rate_ms": 1000,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """The total points accumulated."""
        score = int(raw_result.get("score", 0))
        return score

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        """Basic sanity check."""
        score = raw_result.get("score", 0)
        return isinstance(score, int)
