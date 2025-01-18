/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
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
      text: `SELECT playlist.* FROM playlist
        LEFT JOIN collaborations ON collaborations.playlist_id = playlist.id
        WHERE playlist.owner = $1 OR collaborations.user_id = $1
        GROUP BY playlist.id`,
      values: [playlistOwner],
    };

    const result = await this._pool.query(query);
    return result.rows;
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
}

module.exports = PlaylistsService;
