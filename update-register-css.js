const fs = require('fs');

const loginCss = fs.readFileSync('src/app/login/page.module.css', 'utf8');
let registerCss = fs.readFileSync('src/app/register/page.module.css', 'utf8');

const extraCss = `

.userTypeSection {
    background: rgba(0, 0, 0, 0.2);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.radioGroup {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: var(--radius-md);
}

.radioLabel {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0.6rem 1rem;
    border-radius: var(--radius-sm);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
    flex: 1;
    font-weight: 500;
    color: var(--color-text-secondary);
    position: relative;
    overflow: hidden;
}

.radioLabel[data-checked="true"] {
    background: var(--color-primary);
    color: #fff;
    box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.4);
}

.radioLabel:hover:not([data-checked="true"]) {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-primary);
}

.radioInput {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}
`;

fs.writeFileSync('src/app/register/page.module.css', loginCss + extraCss);
console.log('Done CSS');
