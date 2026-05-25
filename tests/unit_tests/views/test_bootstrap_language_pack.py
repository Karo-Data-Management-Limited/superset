# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from flask import g

from superset.views.base import _load_language_pack, cached_common_bootstrap_data


@pytest.fixture(autouse=True)
def mock_user() -> None:
    g.user = MagicMock()


def _get_bootstrap(user_id: int = 1) -> dict[str, Any]:
    with patch("superset.views.base.menu_data", return_value={}):
        return cached_common_bootstrap_data(user_id=user_id, locale=None)


@pytest.mark.parametrize("language", [None, "", "en"])
def test_load_language_pack_returns_none_for_english(language: str | None) -> None:
    """English (and falsy values) should never load a pack."""
    assert _load_language_pack(language) is None


def test_load_language_pack_returns_none_when_file_missing() -> None:
    """Locales without a messages.json file fall through to the async path."""
    with patch("superset.views.base.os.path.isfile", return_value=False):
        assert _load_language_pack("xx_NOPE") is None


def test_load_language_pack_returns_dict_when_file_present() -> None:
    """A valid Jed JSON file is parsed and returned as a dict."""
    fake_pack = {"domain": "superset", "locale_data": {"superset": {}}}
    mock_open = patch(
        "builtins.open",
        new=MagicMock(),
    )
    with (
        patch("superset.views.base.os.path.isfile", return_value=True),
        patch(
            "superset.views.base.json.loads",
            return_value=fake_pack,
        ) as mock_loads,
        mock_open as mock_file,
    ):
        mock_file.return_value.__enter__.return_value.read.return_value = "{}"
        result = _load_language_pack("pt_BR")

    assert result == fake_pack
    mock_loads.assert_called_once()


def test_load_language_pack_returns_none_on_parse_error() -> None:
    """Malformed JSON is swallowed; caller falls back to the async path."""
    mock_open = patch("builtins.open", new=MagicMock())
    with (
        patch("superset.views.base.os.path.isfile", return_value=True),
        patch(
            "superset.views.base.json.loads",
            side_effect=ValueError("bad json"),
        ),
        mock_open as mock_file,
    ):
        mock_file.return_value.__enter__.return_value.read.return_value = "garbage"
        assert _load_language_pack("pt_BR") is None


def test_bootstrap_includes_language_pack_when_locale_set(
    app_context: None,
) -> None:
    """The bootstrap payload carries the loaded pack under common.language_pack."""
    fake_pack = {"domain": "superset", "locale_data": {"superset": {}}}
    with patch(
        "superset.views.base._load_language_pack",
        return_value=fake_pack,
    ) as mock_load:
        payload = _get_bootstrap()

    assert payload["language_pack"] == fake_pack
    mock_load.assert_called_once()


def test_bootstrap_language_pack_is_none_for_english(
    app_context: None,
) -> None:
    """The pack key is always present (defaults to None for English)."""
    payload = _get_bootstrap()
    assert payload["language_pack"] is None
