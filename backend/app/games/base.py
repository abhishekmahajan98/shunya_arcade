"""
Game Plugin System
==================
Every game implements BaseGame and is auto-discovered by GameRegistry.

To add a new game:
1. Create a folder under app/games/<game_slug>/
2. Create __init__.py that defines a subclass of BaseGame
3. It's automatically registered — no other changes needed.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from importlib import import_module
from pathlib import Path
from typing import Any


@dataclass
class GameMeta:
    """Static metadata for a game. Stored in the DB games table on startup."""
    id: str                          # unique slug, e.g. "snake"
    name: str                        # human-readable, e.g. "Snake"
    description: str
    thumbnail_emoji: str             # fallback if no image, e.g. "🐍"
    tags: list[str]                  # ["solo", "arcade", "classic"]
    score_label: str = "Points"      # displayed on leaderboards
    score_order: str = "desc"        # "desc" = higher is better, "asc" = lower is better
    min_players: int = 1
    max_players: int = 1
    config: dict[str, Any] = field(default_factory=dict)  # game-specific settings


class BaseGame(ABC):
    """
    Abstract base for all game plugins.
    Subclass this in each game's __init__.py.
    """

    @property
    @abstractmethod
    def meta(self) -> GameMeta:
        """Return the static metadata for this game."""
        ...

    @abstractmethod
    def calculate_score(self, raw_result: dict[str, Any]) -> int:
        """
        Convert raw game result payload into a canonical integer score.
        The score is what gets stored and ranked on the leaderboard.
        """
        ...

    @abstractmethod
    def validate_result(self, raw_result: dict[str, Any]) -> bool:
        """
        Basic sanity check on a submitted result.
        Return False to reject the submission (anti-cheat).
        Trust-based for internal tool; override with stricter logic later.
        """
        ...


class GameRegistry:
    """
    Auto-discovers and holds references to all registered game plugins.
    Call `GameRegistry.discover()` once at app startup.
    """

    _games: dict[str, BaseGame] = {}

    @classmethod
    def discover(cls) -> None:
        """
        Walk the app/games/ directory and import every package that
        contains a BaseGame subclass.
        """
        games_dir = Path(__file__).parent
        for game_dir in games_dir.iterdir():
            if game_dir.is_dir() and not game_dir.name.startswith("_"):
                try:
                    module = import_module(f"app.games.{game_dir.name}")
                    # find BaseGame subclasses defined in the module
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (
                            isinstance(attr, type)
                            and issubclass(attr, BaseGame)
                            and attr is not BaseGame
                        ):
                            instance: BaseGame = attr()
                            cls._games[instance.meta.id] = instance
                except Exception as exc:
                    print(f"[GameRegistry] Failed to load game '{game_dir.name}': {exc}")

    @classmethod
    def all(cls) -> list[BaseGame]:
        return list(cls._games.values())

    @classmethod
    def get(cls, game_id: str) -> BaseGame | None:
        return cls._games.get(game_id)

    @classmethod
    def ids(cls) -> list[str]:
        return list(cls._games.keys())
