/**
 * This is a compatibility layer for migrating from Prisma to Supabase.
 * It maintains the same API shape but redirects to Supabase under the hood.
 */

import { supabase, safeSupabaseQuery } from './supabase';

// Export the Supabase client as a Prisma-compatible client
// This way, existing code that imports from @/lib/prisma will continue to work
export const prisma = {
  // User model
  user: {
    findUnique: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('User')
        .select(formatSelectFields(select))
        .match(where)
        .single();
      
      if (error) throw error;
      return data;
    },
    findFirst: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('User')
        .select(formatSelectFields(select))
        .match(where || {})
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data || null;
    },
    findMany: async ({ where, select, take, skip, orderBy }: any) => {
      let query = supabase
        .from('User')
        .select(formatSelectFields(select));
      
      if (where) query = query.match(where);
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0] as [string, any];
        query = query.order(field, { ascending: direction === 'asc' });
      }
      if (skip) query = query.range(skip, skip + (take || 10) - 1);
      else if (take) query = query.limit(take);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async ({ data, include }: any) => {
      const { data: createdData, error } = await supabase
        .from('User')
        .insert(data)
        .select(include ? `*, ${formatInclude(include)}` : '*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    update: async ({ where, data, select }: any) => {
      const { data: updatedData, error } = await supabase
        .from('User')
        .update(data)
        .match(where)
        .select(formatSelectFields(select))
        .single();
      
      if (error) throw error;
      return updatedData;
    },
    delete: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('User')
        .delete()
        .match(where)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    count: async ({ where }: any = {}) => {
      const { count, error } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .match(where || {});
      
      if (error) throw error;
      return count || 0;
    },
  },
  
  // Video model
  video: {
    findUnique: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Video')
        .select(formatSelectFields(select))
        .match(where)
        .single();
      
      if (error) throw error;
      return data;
    },
    findFirst: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Video')
        .select(formatSelectFields(select))
        .match(where || {})
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data || null;
    },
    findMany: async ({ where, select, include, take, skip, orderBy }: any) => {
      let selectString = formatSelectFields(select);
      if (include) {
        selectString = `${selectString || '*'}, ${formatInclude(include)}`;
      }
      
      let query = supabase
        .from('Video')
        .select(selectString);
      
      if (where) query = query.match(where);
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0] as [string, any];
        query = query.order(field, { ascending: direction === 'asc' });
      }
      if (skip) query = query.range(skip, skip + (take || 10) - 1);
      else if (take) query = query.limit(take);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async ({ data, include }: any) => {
      const { data: createdData, error } = await supabase
        .from('Video')
        .insert(data)
        .select(include ? `*, ${formatInclude(include)}` : '*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    update: async ({ where, data, select }: any) => {
      const { data: updatedData, error } = await supabase
        .from('Video')
        .update(data)
        .match(where)
        .select(formatSelectFields(select))
        .single();
      
      if (error) throw error;
      return updatedData;
    },
    delete: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('Video')
        .delete()
        .match(where)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    count: async ({ where }: any = {}) => {
      const { count, error } = await supabase
        .from('Video')
        .select('*', { count: 'exact', head: true })
        .match(where || {});
      
      if (error) throw error;
      return count || 0;
    },
  },

  // Spirit model
  spirit: {
    findUnique: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Spirit')
        .select(formatSelectFields(select))
        .match(where)
        .single();
      
      if (error) throw error;
      return data;
    },
    findMany: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Spirit')
        .select(formatSelectFields(select))
        .match(where || {});
      
      if (error) throw error;
      return data;
    },
  },

  // Review model
  review: {
    findMany: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Review')
        .select(formatSelectFields(select))
        .match(where || {});
      
      if (error) throw error;
      return data;
    },
  },

  // Stream model
  stream: {
    findUnique: async ({ where, select }: any) => {
      const { data, error } = await supabase
        .from('Stream')
        .select(formatSelectFields(select))
        .match(where)
        .single();
      
      if (error) throw error;
      return data;
    },
    findMany: async ({ where, include, orderBy }: any) => {
      let selectString = '*';
      if (include) {
        selectString = `*, ${formatInclude(include)}`;
      }
      
      let query = supabase
        .from('Stream')
        .select(selectString);
      
      if (where) query = query.match(where);
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0] as [string, any];
        query = query.order(field, { ascending: direction === 'asc' });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async ({ data, include }: any) => {
      const { data: createdData, error } = await supabase
        .from('Stream')
        .insert(data)
        .select(include ? `*, ${formatInclude(include)}` : '*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    update: async ({ where, data }: any) => {
      const { data: updatedData, error } = await supabase
        .from('Stream')
        .update(data)
        .match(where)
        .select('*')
        .single();
      
      if (error) throw error;
      return updatedData;
    },
    delete: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('Stream')
        .delete()
        .match(where)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    deleteMany: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('Stream')
        .delete()
        .match(where || {});
      
      if (error) throw error;
      return { count: data?.length || 0 };
    },
    updateMany: async ({ where, data }: any) => {
      const { data: updatedData, error } = await supabase
        .from('Stream')
        .update(data)
        .match(where || {});
      
      if (error) throw error;
      return { count: updatedData?.length || 0 };
    },
  },
  
  // StreamLike model
  streamLike: {
    findUnique: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('StreamLike')
        .select('*')
        .match(where)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data;
    },
    create: async ({ data }: any) => {
      const { data: createdData, error } = await supabase
        .from('StreamLike')
        .insert(data)
        .select('*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    delete: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('StreamLike')
        .delete()
        .match(where)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    count: async ({ where }: any = {}) => {
      const { count, error } = await supabase
        .from('StreamLike')
        .select('*', { count: 'exact', head: true })
        .match(where || {});
      
      if (error) throw error;
      return count || 0;
    },
  },
  
  // StreamSubscription model
  streamSubscription: {
    findUnique: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('StreamSubscription')
        .select('*')
        .match(where)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data;
    },
    create: async ({ data }: any) => {
      const { data: createdData, error } = await supabase
        .from('StreamSubscription')
        .insert(data)
        .select('*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    delete: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('StreamSubscription')
        .delete()
        .match(where)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  },
  
  // StreamReport model
  streamReport: {
    findFirst: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('StreamReport')
        .select('*')
        .match(where || {})
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      return data;
    },
    create: async ({ data }: any) => {
      const { data: createdData, error } = await supabase
        .from('StreamReport')
        .insert(data)
        .select('*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
  },
  
  // StreamTip model
  streamTip: {
    create: async ({ data }: any) => {
      const { data: createdData, error } = await supabase
        .from('StreamTip')
        .insert(data)
        .select('*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
  },
  
  // SecurityEvent model
  securityEvent: {
    count: async ({ where }: any = {}) => {
      const { count, error } = await supabase
        .from('SecurityEvent')
        .select('*', { count: 'exact', head: true })
        .match(where || {});
      
      if (error) throw error;
      return count || 0;
    },
    create: async ({ data }: any) => {
      const { data: createdData, error } = await supabase
        .from('SecurityEvent')
        .insert(data)
        .select('*')
        .single();
      
      if (error) throw error;
      return createdData;
    },
    findMany: async ({ where }: any) => {
      const { data, error } = await supabase
        .from('SecurityEvent')
        .select('*')
        .match(where || {});
      
      if (error) throw error;
      return data;
    },
  },
  
  // Raw query methods
  $queryRaw: async (query: any, ...params: any[]) => {
    // For raw SQL queries, use RPC functions in Supabase
    // This is a simplified implementation - you'll need to create stored procedures in Supabase
    console.warn('$queryRaw is not fully implemented in the Supabase compatibility layer');
    
    // Return mock data until proper implementation
    return [];
  },
  
  // Transaction-like behavior (not fully supported by Supabase)
  $transaction: async (operations: any[]) => {
    console.warn('Transactions are not fully supported in the Supabase compatibility layer');
    
    // Execute operations sequentially
    const results = [];
    for (const operation of operations) {
      const result = await operation;
      results.push(result);
    }
    
    return results;
  },
};

// Helper to format select fields for Supabase
function formatSelectFields(select: any): string | undefined {
  if (!select) return undefined;
  
  return Object.entries(select)
    .filter(([_, value]) => value === true)
    .map(([key]) => key)
    .join(', ');
}

// Helper to format includes for Supabase
function formatInclude(include: any): string {
  return Object.entries(include)
    .map(([table, value]) => {
      // Handle nested select
      if (value && typeof value === 'object' && 'select' in value) {
        const fields = formatSelectFields(value.select);
        return `${table}(${fields || '*'})`;
      }
      return `${table}(*)`;
    })
    .join(', ');
}

// For backward compatibility with Prisma code
export { supabase as default }; 