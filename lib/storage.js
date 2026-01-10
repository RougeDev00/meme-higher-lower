import { supabase } from './supabase';

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data;
}

export async function getAllScores() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all scores:', error);
    return [];
  }

  return data;
}

export async function submitScore(username, score, walletAddress) {
  // If no wallet address, we can't save legally in this new system but for backward compat we try
  // Actually, we require wallet address now for unique identification, but username is display

  if (!walletAddress) {
    console.error('No wallet address provided');
    return getLeaderboard();
  }

  // Check if user has a better score already
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('wallet_address', walletAddress)
    .single();

  if (existing && existing.score >= score) {
    return getLeaderboard();
  }

  const { error } = await supabase
    .from('leaderboard')
    .upsert(
      { wallet_address: walletAddress, username, score },
      { onConflict: 'wallet_address' }
    );

  if (error) {
    console.error('Error submitting score:', error);
  }

  return getLeaderboard();
}

export async function getUserHighScore(walletAddress) {
  if (!walletAddress) return 0;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) return 0;
  return data.score;
}

export async function deleteScore(walletAddress) {
  if (!walletAddress) return false;

  const { error } = await supabase
    .from('leaderboard')
    .delete()
    .eq('wallet_address', walletAddress);

  if (error) {
    console.error('Error deleting score:', error);
    return false;
  }
  return true;
}

export async function deleteAllScores() {


  const { error } = await supabase
    .from('leaderboard')
    .delete()
    .neq('wallet_address', '00000000000000000000000000000000'); // Delete everything that isn't this dummy

  if (error) {
    console.error('Error deleting all scores:', error);
    return false;
  }
  return true;
}
