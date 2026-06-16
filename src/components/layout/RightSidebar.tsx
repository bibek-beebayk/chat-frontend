import React from 'react';
import Link from 'next/link';
import styles from './RightSidebar.module.css';

export function RightSidebar() {
    const onlineMembers = [
        { name: 'AlexKing', level: 22, avatar: 'https://i.pravatar.cc/150?u=1' },
        { name: 'LuckyPlayer99', level: 18, avatar: 'https://i.pravatar.cc/150?u=2' },
        { name: 'SarahQueen', level: 20, avatar: 'https://i.pravatar.cc/150?u=3' },
        { name: 'MikeRollin', level: 15, avatar: 'https://i.pravatar.cc/150?u=4' },
        { name: 'GoldHunter', level: 17, avatar: 'https://i.pravatar.cc/150?u=5' },
    ];

    const upcomingEvents = [
        { date: 'MAY 24', title: 'Weekly Bonus Event', subtitle: 'May 24 - May 28' },
        { date: 'MAY 31', title: 'VIP Exclusive Event', subtitle: 'May 31 - Jun 2' },
        { date: 'JUN 07', title: 'Community Tournament', subtitle: 'Jun 7 - Jun 9' },
    ];

    const recentActivity = [
        { user: 'JohnDoe', action: 'joined the community', time: '2 minutes ago', avatar: 'https://i.pravatar.cc/150?u=6' },
        { user: 'SarahQueen', action: 'posted in General Discussion', time: '5 minutes ago', avatar: 'https://i.pravatar.cc/150?u=3' },
        { user: 'MikeRollin', action: 'won 5,000 XP in Weekly Bonus Event', time: '15 minutes ago', avatar: 'https://i.pravatar.cc/150?u=4' },
        { user: 'AlexKing', action: 'posted in Tips & Strategies', time: '20 minutes ago', avatar: 'https://i.pravatar.cc/150?u=1' },
    ];

    return (
        <div className={styles.rightSidebar}>
            
            {/* Online Members */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Online Members</h3>
                    <span className={styles.onlineCount}><span className={styles.dot}></span>238 Online</span>
                </div>
                <div className={styles.memberList}>
                    {onlineMembers.map((member, i) => (
                        <div key={i} className={styles.memberItem}>
                            <img src={member.avatar} alt={member.name} className={styles.memberAvatar} />
                            <div className={styles.memberInfo}>
                                <h4>{member.name}</h4>
                                <p>Level {member.level}</p>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    ))}
                </div>
                <Link href="/members" className={styles.viewAllBtn}>View All Members</Link>
            </div>

            {/* Upcoming Events */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Upcoming Events</h3>
                    <Link href="/events" className={styles.headerLink}>View All</Link>
                </div>
                <div className={styles.eventList}>
                    {upcomingEvents.map((event, i) => {
                        const [month, day] = event.date.split(' ');
                        return (
                            <div key={i} className={styles.eventItem}>
                                <div className={styles.eventDateBox}>
                                    <span className={styles.eventMonth}>{month}</span>
                                    <span className={styles.eventDay}>{day}</span>
                                </div>
                                <div className={styles.eventInfo}>
                                    <h4>{event.title}</h4>
                                    <p>{event.subtitle}</p>
                                    <Link href="#" className={styles.joinLink}>Join Now</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Recent Activity</h3>
                </div>
                <div className={styles.activityList}>
                    {recentActivity.map((activity, i) => (
                        <div key={i} className={styles.activityItem}>
                            <img src={activity.avatar} alt={activity.user} className={styles.activityAvatar} />
                            <div className={styles.activityInfo}>
                                <p><strong>{activity.user}</strong> {activity.action}</p>
                                <span className={styles.activityTime}>{activity.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <Link href="/activity" className={styles.viewAllBtn}>View All Activity</Link>
            </div>

            {/* Level Progress */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Level Progress</h3>
                </div>
                <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                        <span>Level 12</span>
                        <span>300 / 500 XP</span>
                    </div>
                    <div className={styles.progressBarBg}>
                        <div className={styles.progressBarFill} style={{ width: '60%' }}></div>
                    </div>
                    <div className={styles.progressFooter}>60%</div>
                </div>
                
                <div className={styles.completeProfile}>
                    <div className={styles.completeText}>
                        <h4>Complete your profile</h4>
                        <p>Earn 200 XP</p>
                    </div>
                    <button className={styles.completeBtn}>Complete Profile</button>
                </div>
            </div>

        </div>
    );
}
