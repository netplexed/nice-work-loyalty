export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            items: {
                Row: {
                    id: string
                    name: string
                    price: number
                    image_url: string | null
                    description: string | null
                    category: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    price: number
                    image_url?: string | null
                    description?: string | null
                    category?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    price?: number
                    image_url?: string | null
                    description?: string | null
                    category?: string | null
                }
            }
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    points_balance: number
                    nice_balance: number
                    role: string
                    email: string | null
                    marketing_consent: boolean
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    points_balance?: number
                    nice_balance?: number
                    role?: string
                    email?: string | null
                    marketing_consent?: boolean
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    points_balance?: number
                    nice_balance?: number
                    role?: string
                    email?: string | null
                    marketing_consent?: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            announcements: {
                Row: {
                    id: string
                    created_at: string
                    title: string
                    content: string
                    image_url: string | null
                    action_url: string | null
                    action_label: string | null
                    active: boolean
                    start_date: string
                    end_date: string | null
                    priority: number
                    created_by: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    title: string
                    content: string
                    image_url?: string | null
                    action_url?: string | null
                    action_label?: string | null
                    active?: boolean
                    start_date?: string
                    end_date?: string | null
                    priority?: number
                    created_by?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    title?: string
                    content?: string
                    image_url?: string | null
                    action_url?: string | null
                    action_label?: string | null
                    active?: boolean
                    start_date?: string
                    end_date?: string | null
                    priority?: number
                    created_by?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "announcements_created_by_fkey"
                        columns: ["created_by"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rewards: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    description: string | null
                    points_cost: number
                    image_url: string | null
                    active: boolean
                    stock: number | null
                    category: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    description?: string | null
                    points_cost: number
                    image_url?: string | null
                    active?: boolean
                    stock?: number | null
                    category?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    description?: string | null
                    points_cost?: number
                    image_url?: string | null
                    active?: boolean
                    stock?: number | null
                    category?: string | null
                }
            }
            redemptions: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    reward_id: string
                    status: 'pending' | 'approved' | 'rejected' | 'redeemed'
                    points_spent: number
                    voucher_code: string | null
                    redeemed_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    reward_id: string
                    status?: 'pending' | 'approved' | 'rejected' | 'redeemed'
                    points_spent: number
                    voucher_code?: string | null
                    redeemed_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    reward_id?: string
                    status?: 'pending' | 'approved' | 'rejected' | 'redeemed'
                    points_spent?: number
                    voucher_code?: string | null
                    redeemed_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "redemptions_reward_id_fkey"
                        columns: ["reward_id"]
                        referencedRelation: "rewards"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "redemptions_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    amount: number
                    description: string
                    type: 'earn' | 'redeem'
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id: string
                    amount: number
                    description: string
                    type: 'earn' | 'redeem'
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    amount?: number
                    description?: string
                    type?: 'earn' | 'redeem'
                }
            }
            admin_users: {
                Row: {
                    id: string
                    created_at: string
                    email: string
                    active: boolean
                }
                Insert: {
                    id: string
                    created_at?: string
                    email: string
                    active?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    email?: string
                    active?: boolean
                }
            }
        }
        Views: {
            [_: string]: {
                Row: {
                    [key: string]: Json
                }
                Insert: {
                    [key: string]: Json
                }
                Update: {
                    [key: string]: Json
                }
            }
        }
        Functions: {
            [_: string]: {
                Args: {
                    [key: string]: Json
                }
                Returns: Json
            }
        }
        Enums: {
            [_: string]: string
        }
        CompositeTypes: {
            [_: string]: {
                [key: string]: Json
            }
        }
    }
}
