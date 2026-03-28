"""Memory Match game plugin."""
from typing import Any

from app.games.base import BaseGame, GameMeta


class MemoryGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="memory",
            name="Memory Match",
            description="Flip cards and find all matching pairs as fast as you can!",
            thumbnail_emoji="🃏",
            tags=["solo", "brain", "classic"],
            score_label="Score",
            score_order="desc",
            min_players=1,
            max_players=1,
            config={
                "grid_cols": 4,
                "grid_rows": 4,   # 16 cards = 8 pairs
                "time_limit_s": 120,
            },
        )

    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """
        Score = base points for completion, minus time penalty and move penalty.
        Perfect game (fewest moves, fastest) = highest score.
        """
        pairs_total = int(raw_result.get("pairs_total", 8))
        pairs_matched = int(raw_result.get("pairs_matched", 0))
        moves = int(raw_result.get("moves", 0))
        time_s = float(raw_result.get("time_s", 120))

        if pairs_matched < pairs_total:
            # Incomplete game: score based on how many pairs found
            return max(0, pairs_matched * 50)

        base = pairs_total * 100            # 800 for 8 pairs
        time_penalty = int(time_s * 2)      # -2 per second
        move_penalty = max(0, moves - pairs_total * 2) * 5  # extra moves cost 5 pts each
        return max(0, base - time_penalty - move_penalty)

    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        moves = raw_result.get("moves", 0)
        pairs_matched = raw_result.get("pairs_matched", 0)
        pairs_total = raw_result.get("pairs_total", 8)
        time_s = raw_result.get("time_s", 0)
        return (
            isinstance(moves, int)
            and isinstance(pairs_matched, int)
            and pairs_matched <= pairs_total
            and moves >= pairs_matched  # need at least 1 move per match
            and time_s >= 0
        )
