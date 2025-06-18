1. Game logic is not very efficient.
2. Draw detection periodically falsy detects a draw when X can win on last move 
3. Idle players are asynchronous however active players list is not asynchronous
        this caused us to implement a way to refresh these divs that is bad practice
4.MySQL table creation:
create table logged_in_screenname(screen_name varchar(255), login_time datetime);
create table players(x_player varchar(255), o_player varchar(255));