from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.post_draft.service import (
  create,
  find_one_by_user,
  list_drafts,
  publish_draft,
  update_draft,
)


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  r.scalar_one.return_value = value
  return r


def _scalars_result(values):
  r = MagicMock()
  r.scalars.return_value.all.return_value = values
  return r


_MOCK_GENERATION = {
  'options': [
    {'text': 'Option 1', 'angle_label': 'Story'},
    {'text': 'Option 2', 'angle_label': 'Contrarian'},
    {'text': 'Option 3', 'angle_label': 'Positioning'},
  ],
  'evaluation_feedback': [],
}

_CREATE_DTO = {
  'product_id': 'product-1',
  'today_input': None,
}


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

async def test_create_product_not_found_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))  # product not found
  with pytest.raises(HTTPException) as exc_info:
    await create('user-1', _CREATE_DTO, session)
  assert exc_info.value.status_code == 404


async def test_create_product_no_analysis_raises_404():
  product = MagicMock()
  product.analysis = None
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(product))
  with pytest.raises(HTTPException) as exc_info:
    await create('user-1', _CREATE_DTO, session)
  assert exc_info.value.status_code == 404


async def test_create_no_voice_profile_raises_400():
  product = MagicMock()
  product.analysis = MagicMock()

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[
    _result(product),  # product found
    _result(None),     # voice profile not found
  ])

  with pytest.raises(HTTPException) as exc_info:
    await create('user-1', _CREATE_DTO, session)
  assert exc_info.value.status_code == 400


async def test_create_happy_path_returns_draft_and_feedback():
  product = MagicMock()
  product.analysis = MagicMock()

  voice_profile = MagicMock()
  voice_profile.style_fingerprint = {'tonality': 'Short sentences.', 'openingPatterns': [], 'signaturePhrases': []}
  voice_profile.reference_samples = []

  draft = MagicMock()
  draft.id = 'draft-1'

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[
    _result(product),        # product
    _result(voice_profile),  # voice profile
    _result(draft),          # re-query after creation
  ])

  with patch('app.post_draft.service.generation_pipeline.generate', AsyncMock(return_value=_MOCK_GENERATION)):
    result = await create('user-1', _CREATE_DTO, session)

  assert result['draft'] is draft
  assert result['evaluation_feedback'] == []


# ---------------------------------------------------------------------------
# find_one_by_user
# ---------------------------------------------------------------------------

async def test_find_one_by_user_not_found_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  with pytest.raises(HTTPException) as exc_info:
    await find_one_by_user('draft-1', 'user-1', session)
  assert exc_info.value.status_code == 404


async def test_find_one_by_user_returns_draft():
  draft = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(draft))
  result = await find_one_by_user('draft-1', 'user-1', session)
  assert result is draft


# ---------------------------------------------------------------------------
# update_draft
# ---------------------------------------------------------------------------

async def test_update_draft_not_found_raises_404():
  session = AsyncMock()
  with patch('app.post_draft.service.find_one_by_user', AsyncMock(side_effect=HTTPException(status_code=404, detail='Not found'))):
    with pytest.raises(HTTPException) as exc_info:
      await update_draft('draft-1', 'user-1', {}, session)
  assert exc_info.value.status_code == 404


async def test_update_draft_published_raises_409():
  draft = MagicMock()
  draft.status = 'published'
  session = AsyncMock()

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    with pytest.raises(HTTPException) as exc_info:
      await update_draft('draft-1', 'user-1', {'today_input': 'update'}, session)
  assert exc_info.value.status_code == 409


async def test_update_draft_invalid_option_id_raises_400():
  option = MagicMock()
  option.id = 'valid-id'
  draft = MagicMock()
  draft.status = 'draft'
  draft.options = [option]
  session = AsyncMock()

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    with pytest.raises(HTTPException) as exc_info:
      await update_draft('draft-1', 'user-1', {'selected_option_id': 'invalid-id'}, session)
  assert exc_info.value.status_code == 400


async def test_update_draft_copies_option_text_to_body_when_body_empty():
  option = MagicMock()
  option.id = 'opt-1'
  option.text = 'Selected option text'
  draft = MagicMock()
  draft.id = 'draft-1'
  draft.status = 'draft'
  draft.body = ''
  draft.options = [option]

  updated_draft = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(updated_draft))

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    result = await update_draft('draft-1', 'user-1', {'selected_option_id': 'opt-1'}, session)

  # The update execute was called and re-query returned updated_draft
  assert result is updated_draft


async def test_update_draft_does_not_overwrite_non_empty_body():
  option = MagicMock()
  option.id = 'opt-1'
  option.text = 'Option text'
  draft = MagicMock()
  draft.id = 'draft-1'
  draft.status = 'draft'
  draft.body = 'User edited body'  # non-empty
  draft.options = [option]

  updated_draft = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(updated_draft))

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    result = await update_draft('draft-1', 'user-1', {'selected_option_id': 'opt-1'}, session)

  # Two executes: UPDATE + re-query SELECT
  assert session.execute.call_count == 2
  assert result is updated_draft


# ---------------------------------------------------------------------------
# publish_draft
# ---------------------------------------------------------------------------

async def test_publish_draft_not_found_raises_404():
  session = AsyncMock()
  with patch('app.post_draft.service.find_one_by_user', AsyncMock(side_effect=HTTPException(status_code=404, detail='Not found'))):
    with pytest.raises(HTTPException) as exc_info:
      await publish_draft('draft-1', 'user-1', 'body', session)
  assert exc_info.value.status_code == 404


async def test_publish_draft_no_selected_option_raises_400():
  draft = MagicMock()
  draft.selected_option_id = None
  session = AsyncMock()

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    with pytest.raises(HTTPException) as exc_info:
      await publish_draft('draft-1', 'user-1', 'body', session)
  assert exc_info.value.status_code == 400


async def test_publish_draft_lock_claim_fails_raises_409():
  draft = MagicMock()
  draft.selected_option_id = 'opt-1'

  # Lock claim returns None → already published or concurrent publish
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)):
    with pytest.raises(HTTPException) as exc_info:
      await publish_draft('draft-1', 'user-1', 'body', session)
  assert exc_info.value.status_code == 409


async def test_publish_draft_threads_fails_releases_lock_and_rethrows():
  draft = MagicMock()
  draft.id = 'draft-1'
  draft.selected_option_id = 'opt-1'

  claim_result = _result('draft-1')   # lock claimed
  release_result = MagicMock()        # lock release UPDATE

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[claim_result, release_result])

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)), \
       patch('app.post_draft.service.publish_to_threads', AsyncMock(side_effect=HTTPException(status_code=500, detail='Threads error'))):
    with pytest.raises(HTTPException) as exc_info:
      await publish_draft('draft-1', 'user-1', 'Post body', session)

  assert exc_info.value.status_code == 500
  # execute called twice: lock claim + lock release
  assert session.execute.call_count == 2


async def test_publish_draft_happy_path_returns_published_draft():
  draft = MagicMock()
  draft.id = 'draft-1'
  draft.selected_option_id = 'opt-1'

  published_draft = MagicMock()
  claim_result = _result('draft-1')
  metadata_result = MagicMock()         # metadata UPDATE
  requery_result = _result(published_draft)

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[claim_result, metadata_result, requery_result])

  threads_result = {'threads_media_id': 'media-789', 'permalink': 'https://threads.net/post/abc'}

  with patch('app.post_draft.service.find_one_by_user', AsyncMock(return_value=draft)), \
       patch('app.post_draft.service.publish_to_threads', AsyncMock(return_value=threads_result)):
    result = await publish_draft('draft-1', 'user-1', 'Post body', session)

  assert result is published_draft


# ---------------------------------------------------------------------------
# list_drafts — nextOffset logic
# ---------------------------------------------------------------------------

async def test_list_drafts_next_offset_is_number_when_more_remain():
  items = [MagicMock() for _ in range(10)]  # full page

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[
    _scalars_result(items),  # findMany
    _result(25),             # count = 25
  ])

  result = await list_drafts('user-1', 'product-1', 'draft', 10, 0, session)
  assert result['next_offset'] == 10
  assert result['total'] == 25


async def test_list_drafts_next_offset_null_when_partial_page():
  items = [MagicMock() for _ in range(5)]  # partial page

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[
    _scalars_result(items),
    _result(5),
  ])

  result = await list_drafts('user-1', 'product-1', 'draft', 10, 0, session)
  assert result['next_offset'] is None


async def test_list_drafts_next_offset_null_at_exact_boundary():
  items = [MagicMock() for _ in range(10)]  # full page

  session = AsyncMock()
  session.execute = AsyncMock(side_effect=[
    _scalars_result(items),
    _result(10),  # total == page size, no more items
  ])

  result = await list_drafts('user-1', 'product-1', 'draft', 10, 0, session)
  assert result['next_offset'] is None
