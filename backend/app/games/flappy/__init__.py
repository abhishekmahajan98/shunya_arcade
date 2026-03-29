"""Flappy Bird clone plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class FlappyGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="flappy",
            name="Flappy Bird",
            description="Navigate the bird through the pipes by tapping to flap your wings!",
            thumbnail_emoji="🐦",
            tags=["solo", "arcade", "reflexes"],
            score_label="Pipes Cleared",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "gravity": 0.6,
                "jump_force": -8,
                "pipe_speed": 4,
                "pipe_spawn_rate": 120,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """Score is strictly the number of pipes cleared."""
        pipes_cleared = int(raw_result.get("pipes_cleared", 0))
        return pipes_cleared

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        """Basic sanity check."""
        pipes_cleared = raw_result.get("pipes_cleared", 0)
        
        return (
            isinstance(pipes_cleared, int)
            and pipes_cleared >= 0
        )
