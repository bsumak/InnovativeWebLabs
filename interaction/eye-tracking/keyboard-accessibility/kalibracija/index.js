const jarvis = new Artyom()

jarvis.initialize({
    lang:"en-GB",
    debug:true,
    listen:true,
    speed:0.9,
    mode:"normal"
})

const onKeyClicked = (key) => {
    const outputElement = document.getElementById('written-prompt')

    if (key.toUpperCase() === 'ENTER') {
        const textToRead = outputElement.innerHTML

        jarvis.say(textToRead, {
            onEnd: () => {
                outputElement.innerHTML = ''
            }
        })
    } else if (key.toUpperCase() === 'DEL') {
        outputElement.innerHTML = outputElement.innerHTML.slice(0,-1)
    } else if (key.toUpperCase() === 'SPACE') {
        outputElement.innerHTML += ' '
    } else {
        outputElement.innerHTML += key.toUpperCase()
    }

}