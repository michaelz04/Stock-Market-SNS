import './Navbar.css'

function Navbar(){
    return (
        <nav className="nav">
            <ul>
                <li><a href="/portfolios">Portfolios</a></li>
                <li><a href="/stocklists">Stock Lists</a></li>
                <li><a href="/friends">Friends</a></li>
                <li><a href="/reviews">Reviews</a></li>
                <li><a href="/">Logout</a></li>
            </ul>
        </nav>
    )
}

export default Navbar;