/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(usersService, musicsService) {
    this._pool = new Pool();
    this._usersService = usersService;
    this._musicsService = musicsService;
  }

  async addPlaylist(playlistName, playlistOwner) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistName, playlistOwner],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async deletePlaylist(playlistId) {
    const query = {
      text: 'DELETE FROM playlist WHERE id = $1 RETURNING *',
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError('Playlist gagal dihapus');
    }
  }

  async getPlaylist(playlistOwner) {
    const query = {
      text: `SELECT playlist.id AS id, playlist.name AS name FROM playlist
        LEFT JOIN collaborations ON collaborations.playlist_id = playlist.id
        WHERE playlist.owner = $1 OR collaborations.user_id = $1
        GROUP BY playlist.id`,
      values: [playlistOwner],
    };
    const username = await this._usersService.getUsername(playlistOwner);

    const result = await this._pool.query(query);
    return result.rows.map((item) => {
      item.username = username;
      return item;
    });
  }

  async verifyPlaylistOwner(playlistId, playlistOwner) {
    const query = {
      text: 'SELECT * FROM playlist WHERE id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    if (result.rows[0].owner !== playlistOwner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      } try {
        await this._collaborations.Service.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async addPlaylistSong(playlistId, musicId) {
    await this._musicsService.getMusicById(musicId);

    const id = `playlist-item-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_musics VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, musicId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menambahkan musik ke dalam playlist');
    }
  }
}

module.exports = PlaylistsService;
