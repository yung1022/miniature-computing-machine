#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const HISTORY_FILE = path.join(ROOT, 'data', 'graph-stats.json');
const CONFIG_FILE = path.join(ROOT, 'channels.json');
const STATS_URL = 'https://fyscs1-private-canada5493.tnstats.dev/public/s9_data';
const GROWTH_URL = 'https://public-database.tnstats.dev/s1_growth';

function firstValue(object, keys) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
}

function extractList(payload, listName) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Unexpected ${listName} response format.`);
  }

  const keys = listName === 'channel stats'
    ? ['channels', 'data', 'results', 'items', 'list']
    : ['data', 'results', 'growth', 'items', 'list'];

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === 'object') {
      for (const nestedKey of keys) {
        if (Array.isArray(payload[key][nestedKey])) return payload[key][nestedKey];
      }
    }
  }
  throw new Error(`Could not find a ${listName} list in the response.`);
}

function parseNumber(value, description) {
  const number = typeof value === 'string'
    ? Number(value.replaceAll(',', '').trim())
    : Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric ${description}: ${String(value)}`);
  return number;
}

function normalizeChannel(item) {
  if (!item || typeof item !== 'object') return null;
  const id = firstValue(item, ['cid', 'channelId', 'channel_id', 'channelID', 'id']);
  if (id === undefined) return null;

  const name = firstValue(item, ['cname', 'channelName', 'channel_name', 'name', 'title', 'channel']);
  const rawSubscribers = firstValue(item, [
    'subscriberCountRealAPI', 'subscribers', 'subscriberCount', 'subscriber_count', 'subscribers_count', 'count'
  ]);

  return {
    id: String(id),
    name: name === undefined ? String(id) : String(name),
    subscribers: rawSubscribers === undefined ? 0 : parseNumber(rawSubscribers, `subscriber count for ${id}`)
  };
}

function buildGrowthMap(growthList) {
  const growthById = new Map();
  for (const item of growthList) {
    if (!item || item.cid === undefined || item.cid === null) continue;
    const max = parseNumber(item.subGainMax, `subGainMax for ${item.cid}`);
    const min = parseNumber(item.SubGainMin, `SubGainMin for ${item.cid}`);
    growthById.set(String(item.cid), (max + min) / 2);
  }
  return growthById;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

function percentShare(part, whole) {
  return whole === 0 ? 0 : (part / whole) * 100;
}

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('data/graph-stats.json must contain a JSON array.');
  return parsed;
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const configuredIds = Array.isArray(config.channelIds) ? config.channelIds.map(String) : [];
  const allowedIds = new Set(configuredIds);

  // Fetch each complete feed once; growth records are matched by cid below.
  const [statsPayload, growthPayload] = await Promise.all([
    fetchJson(STATS_URL),
    fetchJson(GROWTH_URL)
  ]);

  const allChannels = extractList(statsPayload, 'channel stats').map(normalizeChannel).filter(Boolean);
  const growthById = buildGrowthMap(extractList(growthPayload, 'growth'));
  const shownChannels = allChannels.filter((channel) => allowedIds.size === 0 || allowedIds.has(channel.id));

  const allSubscriberTotal = allChannels.reduce((total, channel) => total + channel.subscribers, 0);
  const shownSubscriberTotal = shownChannels.reduce((total, channel) => total + channel.subscribers, 0);
  const allGrowthTotal = allChannels.reduce((total, channel) => total + (growthById.get(channel.id) ?? 0), 0);
  const shownGrowthTotal = shownChannels.reduce((total, channel) => total + (growthById.get(channel.id) ?? 0), 0);

  const snapshot = {
    timestamp: new Date().toISOString(),
    subscriberShare: percentShare(shownSubscriberTotal, allSubscriberTotal),
    growthShare: percentShare(shownGrowthTotal, allGrowthTotal),
    totalSubscribers: shownSubscriberTotal,
    totalGrowth: shownGrowthTotal,
    channelSubscribers: shownChannels.map(({ id, name, subscribers }) => ({ channelId: id, channelName: name, value: subscribers })),
    channelGrowth: shownChannels.map(({ id, name }) => ({
      channelId: id,
      channelName: name,
      value: growthById.get(id) ?? 0
    }))
  };

  const history = readHistory();
  history.push(snapshot);
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
  console.log(`Appended graph stats snapshot for ${snapshot.timestamp}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
