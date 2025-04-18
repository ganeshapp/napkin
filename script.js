class GuesstimationCalculator {
    constructor() {
        this.variables = new Map();
        this.lastResults = null;
        this.questions = null;
        this.currentQuestion = null;
        this.loadQuestions();
        this.initializeEventListeners();
        this.checkUrlParameters();
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            this.questions = await response.json();
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    }

    initializeEventListeners() {
        // Add variable button
        document.getElementById('add-variable').addEventListener('click', () => this.addVariableInput());

        // Random question button
        document.getElementById('random-question').addEventListener('click', () => this.setRandomQuestion());

        // Reveal answer button
        document.getElementById('reveal-answer').addEventListener('click', () => this.revealAnswer());

        // Calculate button
        document.getElementById('calculate').addEventListener('click', () => this.calculate());

        // Formula input autocomplete
        const formulaInput = document.getElementById('formula-input');
        formulaInput.addEventListener('input', (e) => this.handleFormulaInput(e));
        formulaInput.addEventListener('keydown', (e) => this.handleFormulaKeydown(e));

        // Confidence interval selection
        document.querySelectorAll('input[name="confidence-level"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.lastResults && this.lastResults.length > 0) {
                    // Recalculate min, max, and range
                    let min = this.lastResults[0];
                    let max = this.lastResults[0];
                    for (let i = 1; i < this.lastResults.length; i++) {
                        if (this.lastResults[i] < min) min = this.lastResults[i];
                        if (this.lastResults[i] > max) max = this.lastResults[i];
                    }
                    const range = max - min;
                    
                    // Update just the confidence interval
                    this.displayConfidenceInterval(this.lastResults, range);
                }
            });
        });

        // Share button
        document.getElementById('share-button').addEventListener('click', () => this.handleShare());
        
        // Copy URL button
        document.getElementById('copy-url').addEventListener('click', () => this.copyShareUrl());

        // Share on X button
        document.getElementById('share-x').addEventListener('click', () => this.shareOnX());

        // Initialize first variable input
        this.initializeFirstVariableInput();
    }

    checkUrlParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const encodedData = urlParams.get('data');
            
            if (encodedData) {
                // First decode the URL encoding, then decode base64, then parse JSON
                const jsonString = atob(decodeURIComponent(encodedData));
                const decodedData = JSON.parse(jsonString);
                
                // Clear existing variables except the first one
                const container = document.getElementById('variables-container');
                while (container.children.length > 0) {
                    container.removeChild(container.lastChild);
                }
                
                // Set title
                document.getElementById('guesstimation-title').value = decodedData.title || '';
                
                // Set current question if it was a pre-configured one
                if (decodedData.questionId && this.questions) {
                    this.currentQuestion = this.questions.find(q => q.id === decodedData.questionId);
                }
                
                // Set formula
                document.getElementById('formula-input').value = decodedData.formula || '';
                
                // Add all variables
                decodedData.variables.forEach((variable, index) => {
                    const group = document.createElement('div');
                    group.className = 'input-group';
                    
                    group.innerHTML = `
                        <input type="text" class="variable-name" placeholder="enter your variable name">
                        <input type="text" class="variable-value" placeholder="enter the value">
                        <button class="remove-variable" ${index === 0 ? 'style="visibility: hidden;"' : ''}>➖</button>
                    `;
                    
                    container.appendChild(group);
                    
                    const nameInput = group.querySelector('.variable-name');
                    const valueInput = group.querySelector('.variable-value');
                    const removeButton = group.querySelector('.remove-variable');
                    
                    nameInput.value = variable.name;
                    valueInput.value = variable.value;
                    
                    // Add event listeners
                    nameInput.addEventListener('input', (e) => this.handleVariableNameInput(e));
                    valueInput.addEventListener('input', (e) => this.handleVariableValueInput(e));
                    if (index > 0) {
                        removeButton.addEventListener('click', () => group.remove());
                    }
                });
                
                // Auto calculate
                this.calculate();
            }
        } catch (error) {
            console.error('Error parsing URL parameters:', error);
            alert('Error loading shared calculation. Please check the URL and try again.');
        }
    }

    handleShare() {
        try {
            // Collect variables and formula
            const variables = [];
            document.querySelectorAll('.input-group').forEach(group => {
                const name = group.querySelector('.variable-name').value.trim();
                const value = group.querySelector('.variable-value').value.trim();
                if (name && value) {
                    variables.push({ name, value });
                }
            });
            
            const formula = document.getElementById('formula-input').value.trim();
            const title = document.getElementById('guesstimation-title').value.trim();
            
            // Create data object
            const data = {
                title,
                variables,
                formula,
                questionId: this.currentQuestion ? this.currentQuestion.id : null
            };
            
            // First stringify then encode the data to handle special characters
            const jsonString = JSON.stringify(data);
            const encodedData = encodeURIComponent(btoa(jsonString));
            
            // Create URL
            const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
            
            // Show URL container and set URL
            const urlContainer = document.getElementById('share-url-container');
            const urlInput = document.getElementById('share-url');
            urlContainer.style.display = 'flex';
            urlInput.value = shareUrl;
            
            // Select the URL for easy copying
            urlInput.select();
        } catch (error) {
            console.error('Error generating share URL:', error);
            alert('Error generating share URL. Please try again.');
        }
    }

    copyShareUrl() {
        try {
            const shareUrl = document.getElementById('share-url');
            shareUrl.select();
            document.execCommand('copy');
            
            // Show confirmation
            const confirmation = document.getElementById('copy-confirmation');
            confirmation.style.display = 'inline';
            setTimeout(() => {
                confirmation.style.display = 'none';
            }, 2000);
        } catch (error) {
            console.error('Error copying URL:', error);
            alert('Error copying URL. Please try copying manually.');
        }
    }

    initializeFirstVariableInput() {
        const firstVariableName = document.querySelector('.variable-name');
        const firstVariableValue = document.querySelector('.variable-value');

        firstVariableName.addEventListener('input', (e) => this.handleVariableNameInput(e));
        firstVariableValue.addEventListener('input', (e) => this.handleVariableValueInput(e));
    }

    handleVariableNameInput(e) {
        const input = e.target;
        input.value = input.value.replace(/\s+/g, '_');
        
        // Check for duplicate variable names
        const allNames = Array.from(document.querySelectorAll('.variable-name'))
            .map(el => el.value)
            .filter(name => name !== input.value);
        
        if (allNames.includes(input.value)) {
            input.classList.add('error');
            this.showDuplicateVariableError(input);
        } else {
            input.classList.remove('error');
            this.hideDuplicateVariableError(input);
        }
    }

    showDuplicateVariableError(input) {
        let errorDiv = input.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
        }
        const suggestion = this.generateUniqueVariableName(input.value);
        errorDiv.innerHTML = `Variable name already exists. <a href="#" class="suggestion">Use ${suggestion} instead?</a>`;
        
        errorDiv.querySelector('.suggestion').addEventListener('click', (e) => {
            e.preventDefault();
            input.value = suggestion;
            input.classList.remove('error');
            this.hideDuplicateVariableError(input);
        });
    }

    hideDuplicateVariableError(input) {
        const errorDiv = input.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.remove();
        }
    }

    generateUniqueVariableName(name) {
        let counter = 1;
        let newName = name;
        const allNames = Array.from(document.querySelectorAll('.variable-name'))
            .map(el => el.value);
        
        while (allNames.includes(newName)) {
            newName = `${name}_${counter}`;
            counter++;
        }
        return newName;
    }

    handleVariableValueInput(e) {
        const input = e.target;
        const value = input.value.trim();
        
        // Validate number format
        const isValid = this.validateNumberFormat(value);
        if (!isValid) {
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    }

    validateNumberFormat(value) {
        // Regular expression for valid number formats including percentages
        const numberRegex = /^-?\d*\.?\d*\s*[kKmMbBtT%]?$|^-?\d*\.?\d*\s*[kKmMbBtT%]?\s*~\s*-?\d*\.?\d*\s*[kKmMbBtT%]?$/;
        return numberRegex.test(value);
    }

    addVariableInput() {
        const container = document.getElementById('variables-container');
        const newGroup = document.createElement('div');
        newGroup.className = 'input-group';
        
        newGroup.innerHTML = `
            <input type="text" class="variable-name" placeholder="enter your variable name">
            <input type="text" class="variable-value" placeholder="enter the value">
            <button class="remove-variable">➖</button>
        `;

        container.appendChild(newGroup);

        // Add event listeners
        const variableName = newGroup.querySelector('.variable-name');
        const variableValue = newGroup.querySelector('.variable-value');
        const removeButton = newGroup.querySelector('.remove-variable');

        variableName.addEventListener('input', (e) => this.handleVariableNameInput(e));
        variableValue.addEventListener('input', (e) => this.handleVariableValueInput(e));
        removeButton.addEventListener('click', () => newGroup.remove());
    }

    handleFormulaInput(e) {
        const input = e.target;
        const cursorPos = input.selectionStart;
        const text = input.value;
        const lastWord = this.getLastWord(text, cursorPos);
        
        if (lastWord.length >= 2) {
            this.showVariableSuggestions(lastWord, input, cursorPos);
        } else {
            this.hideVariableSuggestions();
        }
    }

    getLastWord(text, cursorPos) {
        const beforeCursor = text.substring(0, cursorPos);
        const words = beforeCursor.split(/[\s+\-*/()]/);
        return words[words.length - 1];
    }

    showVariableSuggestions(partial, input, cursorPos) {
        const suggestions = document.getElementById('formula-suggestions');
        const variables = Array.from(document.querySelectorAll('.variable-name'))
            .map(el => el.value)
            .filter(name => name.toLowerCase().includes(partial.toLowerCase()));
        
        if (variables.length > 0) {
            suggestions.innerHTML = variables.map(name => 
                `<div class="suggestion-item">${name}</div>`
            ).join('');
            
            const inputRect = input.getBoundingClientRect();
            suggestions.style.top = `${inputRect.bottom}px`;
            suggestions.style.left = `${inputRect.left}px`;
            suggestions.style.display = 'block';
            
            suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const beforeCursor = input.value.substring(0, cursorPos - partial.length);
                    const afterCursor = input.value.substring(cursorPos);
                    input.value = beforeCursor + item.textContent + afterCursor;
                    this.hideVariableSuggestions();
                    input.focus();
                    input.setSelectionRange(
                        beforeCursor.length + item.textContent.length,
                        beforeCursor.length + item.textContent.length
                    );
                });
            });
        } else {
            this.hideVariableSuggestions();
        }
    }

    hideVariableSuggestions() {
        const suggestions = document.getElementById('formula-suggestions');
        suggestions.style.display = 'none';
    }

    handleFormulaKeydown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const suggestions = document.getElementById('formula-suggestions');
            const firstSuggestion = suggestions.querySelector('.suggestion-item');
            if (firstSuggestion) {
                firstSuggestion.click();
            }
        }
    }

    validateFormula(formula) {
        try {
            // Check for undefined variables
            const definedVariables = Array.from(document.querySelectorAll('.variable-name'))
                .map(el => el.value.trim())
                .filter(name => name !== '');
            
            const usedVariables = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            const undefinedVariables = usedVariables.filter(v => !definedVariables.includes(v));
            
            if (undefinedVariables.length > 0) {
                console.error(`Undefined variables: ${undefinedVariables.join(', ')}`);
                return false;
            }

            // Check for balanced parentheses
            let balance = 0;
            for (const char of formula) {
                if (char === '(') balance++;
                if (char === ')') balance--;
                if (balance < 0) {
                    console.error('Unbalanced parentheses');
                    return false;
                }
            }
            if (balance !== 0) {
                console.error('Unbalanced parentheses');
                return false;
            }

            // Check for valid mathematical expression
            const validOperators = ['+', '-', '*', '/', '^', '(', ')'];
            const tokens = formula.split(/([+\-*/^()])/).filter(t => t.trim());
            
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].trim();
                if (!validOperators.includes(token) && !definedVariables.includes(token) && 
                    !/^-?\d*\.?\d*$/.test(token)) {
                    console.error(`Invalid token: ${token}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Formula validation error:', error);
            return false;
        }
    }

    parseValue(value) {
        const multiplier = {
            'k': 1e3,
            'm': 1e6,
            'b': 1e9,
            't': 1e12,
            '%': 0.01
        };
        
        if (value.includes('~')) {
            // Split on ~ and trim any whitespace
            const [minStr, maxStr] = value.split('~').map(v => v.trim());
            
            // Check if both parts use the same unit
            const minMatch = minStr.match(/^(-?\d*\.?\d*)\s*([kKmMbBtT%])?$/);
            const maxMatch = maxStr.match(/^(-?\d*\.?\d*)\s*([kKmMbBtT%])?$/);
            
            if (!minMatch || !maxMatch) throw new Error(`Invalid range format: ${value}`);
            
            const [, minNumber, minUnit] = minMatch;
            const [, maxNumber, maxUnit] = maxMatch;
            
            // If units are present, they must match
            if (minUnit && maxUnit && minUnit.toLowerCase() !== maxUnit.toLowerCase()) {
                throw new Error('Units must match in range values');
            }
            
            const unit = minUnit || maxUnit;
            const min = parseFloat(minNumber);
            const max = parseFloat(maxNumber);
            
            if (unit) {
                return {
                    type: 'range',
                    min: min * multiplier[unit.toLowerCase()],
                    max: max * multiplier[unit.toLowerCase()]
                };
            }
            
            return { type: 'range', min, max };
        }
        
        return { type: 'single', value: this.parseSingleValue(value) };
    }

    parseSingleValue(value) {
        const multiplier = {
            'k': 1e3,
            'm': 1e6,
            'b': 1e9,
            't': 1e12,
            '%': 0.01
        };
        
        const match = value.match(/^(-?\d*\.?\d*)\s*([kKmMbBtT%])?$/);
        if (!match) throw new Error(`Invalid value format: ${value}`);
        
        const [, number, unit] = match;
        const baseValue = parseFloat(number);
        
        if (unit) {
            return baseValue * multiplier[unit.toLowerCase()];
        }
        return baseValue;
    }

    calculate() {
        const loadingSpinner = document.getElementById('loading-spinner');
        const resultsSection = document.getElementById('results');
        const shareSection = document.querySelector('.share-section');
        
        // Hide results and show loading spinner
        resultsSection.style.display = 'none';
        shareSection.style.display = 'none';
        loadingSpinner.style.display = 'flex';

        try {
            // Get all the input values
            const variables = new Map();
            let hasRange = false;
            const variableInputs = document.querySelectorAll('.input-group');
            let hasError = false;

            variableInputs.forEach(group => {
                const nameInput = group.querySelector('.variable-name');
                const valueInput = group.querySelector('.variable-value');
                const name = nameInput.value.trim();
                const value = valueInput.value.trim();

                if (name && value) {
                    if (!this.validateNumberFormat(value)) {
                        valueInput.classList.add('error');
                        hasError = true;
                    } else {
                        valueInput.classList.remove('error');
                        try {
                            const parsedValue = this.parseValue(value);
                            variables.set(name, parsedValue);
                            if (parsedValue.type === 'range') {
                                hasRange = true;
                            }
                        } catch (error) {
                            console.error(`Error parsing value for ${name}:`, error);
                            valueInput.classList.add('error');
                            hasError = true;
                        }
                    }
                }
            });

            // Get the formula
            const formulaInput = document.getElementById('formula-input');
            const formula = formulaInput.value.trim();

            if (!formula) {
                formulaInput.classList.add('error');
                hasError = true;
            } else {
                formulaInput.classList.remove('error');
            }

            if (hasError) {
                loadingSpinner.style.display = 'none';
                return;
            }

            // Validate formula
            if (!this.validateFormula(formula)) {
                formulaInput.classList.add('error');
                loadingSpinner.style.display = 'none';
                return;
            }

            // Show results section
            resultsSection.style.display = 'block';
            
            if (hasRange) {
                // If there's at least one range, perform Monte Carlo simulation
                document.getElementById('single-value-result').style.display = 'none';
                document.getElementById('simulation-results').style.display = 'block';
                
                const results = this.monteCarloSimulation(formula, variables);
                this.lastResults = results;

                if (results.length === 0) {
                    console.error('No results generated');
                    loadingSpinner.style.display = 'none';
                    return;
                }

                // Display results
                this.displayResults(results);
            } else {
                // If all inputs are single values, calculate exact result
                document.getElementById('single-value-result').style.display = 'block';
                document.getElementById('simulation-results').style.display = 'none';
                
                const exactResult = this.calculateExactResult(formula, variables);
                document.getElementById('exact-value').textContent = 
                    this.formatGuesstimationNumber(exactResult, 'exact', 1);
            }
            
            // Show share section
            shareSection.style.display = 'block';
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Error in calculation. Please check your inputs and formula.');
        } finally {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
        }
    }

    calculateExactResult(formula, variables) {
        const variableValues = {};
        for (const [name, value] of variables.entries()) {
            variableValues[name] = value.type === 'single' ? value.value : value.min;
        }
        
        return this.evaluateFormula(formula, variableValues);
    }

    evaluateFormula(formula, variables) {
        // Create a safe evaluation context
        const context = {
            ...variables,
            Math: Math,
            // Add basic math functions
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            sqrt: Math.sqrt,
            pow: Math.pow,
            exp: Math.exp,
            log: Math.log,
            abs: Math.abs,
            round: Math.round,
            floor: Math.floor,
            ceil: Math.ceil
        };

        // Replace variable names with their values
        let expression = formula;
        for (const [name, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\b${name}\\b`, 'g');
            expression = expression.replace(regex, value);
        }
        
        // Replace ^ with ** for exponentiation
        expression = expression.replace(/\^/g, '**');
        
        try {
            // Create and execute the evaluation function
            const evalFn = new Function('context', `with(context) { return ${expression}; }`);
            const result = evalFn(context);
            
            if (typeof result !== 'number' || !isFinite(result)) {
                throw new Error('Formula did not evaluate to a valid number');
            }
            
            return result;
        } catch (error) {
            throw new Error(`Error evaluating formula: ${error.message}`);
        }
    }

    monteCarloSimulation(formula, variables, iterations = 250000) {
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            const variableValues = {};
            for (const [name, value] of variables) {
                if (value.type === 'range') {
                    variableValues[name] = value.min + Math.random() * (value.max - value.min);
                } else {
                    variableValues[name] = value.value;
                }
            }
            
            const result = this.evaluateFormula(formula, variableValues);
            results.push(result);
        }
        
        return results.sort((a, b) => a - b);
    }

    displayResults(results) {
        // Show/hide reveal answer section based on whether we're using a pre-configured question
        const revealAnswerSection = document.getElementById('reveal-answer-section');
        if (this.currentQuestion) {
            revealAnswerSection.style.display = 'block';
            document.getElementById('answer-display').style.display = 'none';
            document.getElementById('reveal-answer').disabled = false;
        } else {
            revealAnswerSection.style.display = 'none';
        }

        // Store results as a class property for reuse
        this.lastResults = [...results]; // Make a copy to be safe
        
        // Calculate min, max, and range using a single pass through the data
        let min = results[0];
        let max = results[0];
        for (let i = 1; i < results.length; i++) {
            if (results[i] < min) min = results[i];
            if (results[i] > max) max = results[i];
        }
        const range = max - min;

        // Display confidence interval
        this.displayConfidenceInterval(results, range);

        // Create histogram
        this.createHistogram(results, min, max, range);

        // Display percentiles
        const tableBody = document.querySelector('#percentile-table tbody');
        tableBody.innerHTML = '';
        
        for (let p = 5; p <= 95; p += 5) {
            const index = Math.floor(results.length * p / 100);
            const value = results[index];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p}%</td>
                <td>${this.formatGuesstimationNumber(value, 'percentile', range)}</td>
            `;
            tableBody.appendChild(row);
        }
    }

    displayConfidenceInterval(results, range) {
        // Get selected confidence level
        const confidenceLevel = parseInt(document.querySelector('input[name="confidence-level"]:checked').value);
        
        // Calculate indices based on confidence level
        const alpha = (100 - confidenceLevel) / 2;
        const lowerIndex = Math.floor(results.length * (alpha / 100));
        const upperIndex = Math.floor(results.length * (1 - alpha / 100));
        
        const confidenceInterval = {
            lower: results[lowerIndex],
            upper: results[upperIndex]
        };

        // Update display
        document.getElementById('interval-value').textContent = 
            `${this.formatGuesstimationNumber(confidenceInterval.lower, 'confidence', range)} to ${this.formatGuesstimationNumber(confidenceInterval.upper, 'confidence', range)}`;
    }

    createHistogram(results, dataMin, dataMax, range) {
        try {
            const canvas = document.getElementById('histogram-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set canvas dimensions
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            // Process data in chunks to avoid memory issues
            const CHUNK_SIZE = 10000;
            const numBins = 20;
            const bins = new Uint32Array(numBins);

            // Use passed min/max values
            const min = dataMin;
            const max = dataMax;
            const binSize = range / numBins;

            // Count values in chunks
            for (let i = 0; i < results.length; i += CHUNK_SIZE) {
                const chunk = results.slice(i, i + CHUNK_SIZE);
                for (const value of chunk) {
                    const binIndex = Math.min(
                        Math.floor((value - min) / binSize),
                        numBins - 1
                    );
                    bins[binIndex]++;
                }
            }

            // Find maximum frequency and its bin index
            let maxFrequency = 0;
            let maxFrequencyIndex = 0;
            for (let i = 0; i < numBins; i++) {
                if (bins[i] > maxFrequency) {
                    maxFrequency = bins[i];
                    maxFrequencyIndex = i;
                }
            }

            // Set up drawing parameters
            const padding = { left: 20, right: 20, top: 20, bottom: 40 };
            const graphWidth = canvas.width - padding.left - padding.right;
            const graphHeight = canvas.height - padding.top - padding.bottom;
            const barWidth = graphWidth / numBins;

            // Draw bars
            for (let i = 0; i < numBins; i++) {
                const height = (bins[i] / maxFrequency) * graphHeight;
                const x = padding.left + i * barWidth;
                const y = canvas.height - padding.bottom - height;

                // Use different color for the highest frequency bar
                if (i === maxFrequencyIndex) {
                    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)'; // Red color for highest bar
                } else {
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.7)'; // Blue color for other bars
                }

                ctx.fillRect(x, y, barWidth - 1, height);
            }

            // Draw x-axis
            ctx.beginPath();
            ctx.moveTo(padding.left, canvas.height - padding.bottom);
            ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
            ctx.strokeStyle = '#666';
            ctx.stroke();

            // Draw x-axis labels
            ctx.fillStyle = '#666';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';

            // Draw labels for every bin
            for (let i = 0; i < numBins; i++) {
                const x = padding.left + i * barWidth + barWidth / 2;
                const value = min + (i + 0.5) * binSize; // Middle value of the bin
                const label = this.formatGuesstimationNumber(value, 'histogram', range);
                
                // Rotate labels for better readability
                ctx.save();
                ctx.translate(x, canvas.height - padding.bottom + 5);
                ctx.rotate(Math.PI / 4);
                ctx.fillText(label, 0, 0);
                ctx.restore();
            }

        } catch (error) {
            console.error('Error creating histogram:', error);
            const histogramDiv = document.getElementById('histogram');
            histogramDiv.innerHTML = `
                <div class="error-message">
                    <p>Error creating histogram visualization: ${error.message}</p>
                    <p>Please try again or contact support if the problem persists.</p>
                </div>
            `;
        }
    }

    displayPercentiles(results) {
        try {
            const tableBody = document.querySelector('#percentile-table tbody');
            tableBody.innerHTML = '';
            
            // Calculate percentiles more efficiently
            const percentiles = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                               55, 60, 65, 70, 75, 80, 85, 90, 95];
            
            for (const p of percentiles) {
                const index = Math.floor(results.length * p / 100);
                const value = results[index];
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p}%</td>
                    <td>${value.toLocaleString()}</td>
                `;
                tableBody.appendChild(row);
            }
        } catch (error) {
            console.error('Error displaying percentiles:', error);
            document.getElementById('percentiles').innerHTML = 
                '<p class="error-message">Error calculating percentiles</p>';
        }
    }

    // Helper to count significant digits before decimal
    getSignificantDigits(num) {
        return Math.floor(Math.abs(num)).toString().length;
    }

    // Helper to determine if we should use unit formatting
    shouldUseUnit(value, stepSize) {
        // First round the value based on step size
        const roundingPrecision = this.getRoundingPrecision(value, stepSize);
        const roundedValue = Math.round(value / roundingPrecision) * roundingPrecision;
        
        // Get the potential unit divisor and check digits before decimal
        let unitDivisor = 1;
        const absValue = Math.abs(roundedValue);
        
        // Try each unit and check if we'd have at least 2 digits before decimal
        if (absValue >= 1e12 && (absValue / 1e12) >= 10) unitDivisor = 1e12;
        else if (absValue >= 1e9 && (absValue / 1e9) >= 10) unitDivisor = 1e9;
        else if (absValue >= 1e6 && (absValue / 1e6) >= 10) unitDivisor = 1e6;
        else if (absValue >= 1e3 && (absValue / 1e3) >= 10) unitDivisor = 1e3;
        
        // If no unit gives us 2 digits before decimal, don't use unit formatting
        if (unitDivisor === 1) return false;
        
        // Check if step size would allow distinguishable values
        const stepInUnits = stepSize / unitDivisor;
        return stepInUnits >= 0.1;
    }

    // Get appropriate rounding precision based on value and context
    getRoundingPrecision(value, stepSize) {
        const magnitude = Math.floor(Math.log10(Math.abs(value)));
        const stepMagnitude = Math.floor(Math.log10(stepSize));
        
        // If step size is very small relative to value, use finer precision
        if (magnitude - stepMagnitude >= 3) {
            return Math.pow(10, magnitude - 2);
        }
        // For medium differences
        else if (magnitude - stepMagnitude >= 2) {
            return Math.pow(10, magnitude - 1);
        }
        // For close values
        else {
            return Math.pow(10, stepMagnitude);
        }
    }

    // Format number with intelligent rounding and unit selection
    formatGuesstimationNumber(value, context = 'default', range) {
        if (value === 0) return '0';
        
        const absValue = Math.abs(value);
        let stepSize;
        
        // Determine step size based on context
        switch(context) {
            case 'confidence':
                stepSize = range / 10;
                break;
            case 'histogram':
                stepSize = range / 20;
                break;
            case 'percentile':
                // For percentiles, look at typical difference between values
                stepSize = range / 20;
                break;
            default:
                stepSize = range / 20;
        }
        
        // Round the value appropriately
        const roundingPrecision = this.getRoundingPrecision(value, stepSize);
        const roundedValue = Math.round(value / roundingPrecision) * roundingPrecision;
        
        // Only apply unit formatting if appropriate
        if (this.shouldUseUnit(roundedValue, stepSize)) {
            // Only use unit if we'll have at least 2 digits before decimal
            if (absValue >= 1e12 && (absValue / 1e12) >= 10) {
                return (roundedValue / 1e12).toFixed(1) + 'T';
            } else if (absValue >= 1e9 && (absValue / 1e9) >= 10) {
                return (roundedValue / 1e9).toFixed(1) + 'B';
            } else if (absValue >= 1e6 && (absValue / 1e6) >= 10) {
                return (roundedValue / 1e6).toFixed(1) + 'M';
            } else if (absValue >= 1e3 && (absValue / 1e3) >= 10) {
                return (roundedValue / 1e3).toFixed(1) + 'K';
            }
        }
        
        // For smaller numbers or when unit formatting isn't appropriate
        return roundedValue.toLocaleString();
    }

    setRandomQuestion() {
        if (!this.questions) return;
        
        // Pick a random question
        const randomIndex = Math.floor(Math.random() * this.questions.length);
        this.currentQuestion = this.questions[randomIndex];
        
        // Set the title
        document.getElementById('guesstimation-title').value = this.currentQuestion.question;
    }

    revealAnswer() {
        if (!this.currentQuestion) return;
        
        const answerDisplay = document.getElementById('answer-display');
        answerDisplay.textContent = this.currentQuestion.estimated_answer;
        answerDisplay.style.display = 'block';
        
        // Disable the reveal button after showing the answer
        document.getElementById('reveal-answer').disabled = true;
    }

    shareOnX() {
        const title = document.getElementById('guesstimation-title').value.trim();
        const shareUrl = document.getElementById('share-url').value;
        
        // Get the confidence interval (90% is the default)
        const confidenceInterval = document.getElementById('interval-value').textContent;
        
        // Create the tweet text with the result
        let tweetText = `${title}\n\nMy estimate (90% confidence): ${confidenceInterval}\n\n${shareUrl}\n\n#BackOfTheNapkin #guesstimation`;
        
        // Encode the text for URL
        tweetText = encodeURIComponent(tweetText);
        
        // Open X.com in a new window
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GuesstimationCalculator();
}); 