import { supabase } from './supabase';

export async function getLeaderboard() {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data;
}

export async function getAllScores() {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }

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
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }

  if (!walletAddress) {
    console.error('No wallet address provided');
    return getLeaderboard();
  }

  // Check if user has a better score already
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('score, username')
    .eq('wallet_address', walletAddress)
    .single();

  if (existing) {
    const isNewHighScore = score > existing.score;
    const finalScore = isNewHighScore ? score : existing.score;

    // Always update last_score. Update score only if higher.
    const updates = {
      last_score: score,
      score: finalScore
    };

    // Update username if it changed
    if (existing.username !== username) {
      updates.username = username;
    }

    const { error } = await supabase
      .from('leaderboard')
      .update(updates)
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error updating score:', error);
    }
  } else {
    // New user
    const { error } = await supabase
      .from('leaderboard')
      .upsert(
        { wallet_address: walletAddress, username, score, last_score: score },
        { onConflict: 'wallet_address' }
      );

    if (error) {
      console.error('Error submitting score:', error);
    }
  }

  return getLeaderboard();
}

export async function getUserHighScore(walletAddress) {
  if (!supabase) return 0;
  if (!walletAddress) return 0;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) return 0;
  return data.score;
}

export async function getUserProfile(walletAddress) {
  if (!supabase) return null;
  if (!walletAddress) return null;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('username, score, last_score, wallet_address')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching profile:', error);
    return null;
  }

  return {
    username: data.username,
    topScore: data.score,
    lastScore: data.last_score,
    walletAddress: data.wallet_address
  };
}

export async function updateUsername(walletAddress, newUsername) {
  if (!supabase) return false;

  const { error } = await supabase
    .from('leaderboard')
    .update({ username: newUsername })
    .eq('wallet_address', walletAddress);

  if (error) {
    console.error('Error updating username:', error);
    return false;
  }
  return true;
}

export async function deleteScore(walletAddress) {
  if (!supabase) return false;
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
  if (!supabase) return false;

  const { error } = await supabase
    .from('leaderboard')
    .delete()
    .neq('wallet_address', '00000000000000000000000000000000');

  if (error) {
    console.error('Error deleting all scores:', error);
    return false;
  }
  return true;
}
export async function getUserByWallet(walletAddress) {
  if (!supabase) return null;
  if (!walletAddress) return null;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('username')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) return null;
  return data.username;
}

// Track all play sessions (with or without wallet)
export async function trackPlaySession(username, walletAddress = null) {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return false;
  }

  const { error } = await supabase
    .from('play_sessions')
    .insert({
      username,
      wallet_address: walletAddress || null,
      has_wallet: !!walletAddress
    });

  if (error) {
    console.error('Error tracking play session:', error);
    return false;
  }

  return true;
}

// Get total play sessions count
export async function getPlaySessionsCount() {
  if (!supabase) return { total: 0, withWallet: 0, withoutWallet: 0 };

  const { count: total } = await supabase
    .from('play_sessions')
    .select('*', { count: 'exact', head: true });

  const { count: withWallet } = await supabase
    .from('play_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('has_wallet', true);

  return {
    total: total || 0,
    withWallet: withWallet || 0,
    withoutWallet: (total || 0) - (withWallet || 0)
  };
}

// ===== REWARDED USERS =====

// Get all rewarded users
export async function getRewardedUsers() {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }

  const { data, error } = await supabase
    .from('rewarded_users')
    .select('*')
    .order('rewarded_at', { ascending: false });

  if (error) {
    console.error('Error fetching rewarded users:', error);
    return [];
  }

  return data;
}

// Reward a user: move from leaderboard to rewarded_users
export async function rewardUser(walletAddress, username, score, solAmount) {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  if (!walletAddress || !solAmount) {
    return { success: false, error: 'Wallet address and SOL amount required' };
  }

  // Insert into rewarded_users
  const { error: insertError } = await supabase
    .from('rewarded_users')
    .insert({
      wallet_address: walletAddress,
      username: username || 'Anonymous',
      original_score: score || 0,
      sol_amount: parseFloat(solAmount)
    });

  if (insertError) {
    console.error('Error inserting rewarded user:', insertError);
    return { success: false, error: insertError.message };
  }

  // Remove from leaderboard
  const { error: deleteError } = await supabase
    .from('leaderboard')
    .delete()
    .eq('wallet_address', walletAddress);

  if (deleteError) {
    console.error('Error removing from leaderboard:', deleteError);
    // Rollback: delete from rewarded_users
    await supabase.from('rewarded_users').delete().eq('wallet_address', walletAddress);
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

// Unreward a user: move from rewarded_users back to leaderboard
export async function unrewardUser(walletAddress) {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return { success: false, error: 'Supabase not initialized' };
  }

  if (!walletAddress) {
    return { success: false, error: 'Wallet address required' };
  }

  // Get the rewarded user data first
  const { data: rewardedUser, error: fetchError } = await supabase
    .from('rewarded_users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (fetchError || !rewardedUser) {
    console.error('Error fetching rewarded user:', fetchError);
    return { success: false, error: 'User not found in rewarded list' };
  }

  // Insert back into leaderboard
  const { error: insertError } = await supabase
    .from('leaderboard')
    .insert({
      wallet_address: rewardedUser.wallet_address,
      username: rewardedUser.username,
      score: rewardedUser.original_score,
      last_score: rewardedUser.original_score
    });

  if (insertError) {
    console.error('Error inserting into leaderboard:', insertError);
    return { success: false, error: insertError.message };
  }

  // Remove from rewarded_users
  const { error: deleteError } = await supabase
    .from('rewarded_users')
    .delete()
    .eq('wallet_address', walletAddress);

  if (deleteError) {
    console.error('Error removing from rewarded_users:', deleteError);
    // Rollback: delete from leaderboard
    await supabase.from('leaderboard').delete().eq('wallet_address', walletAddress);
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}
