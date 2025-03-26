function Portfolio (){
    const user = localStorage.getItem("user");
    return(
        <div className='Body'>
            <h2>
                Hello {user}
            </h2>
        </div>
    )
}

export default Portfolio;